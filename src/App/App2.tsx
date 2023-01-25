import { useState, useEffect, useRef } from "react";
import axios from "axios";
const numChannels: any = 1;

const AudioRecord = () => {
  const api = async (formData: any) => {
    const config = {
      headers: { "content-type": "multipart/form-data" },
    };
    const data = await axios.post(
      "http://3.38.129.209:8080/stt",
      formData,
      config
    );
    return data;
  };

  const recBuffers = useRef<any>([]);
  const [recLength, setRecLength] = useState(0);
  const listening = useRef(false);
  const [time, setTime] = useState<any>(null);
  const [failedToGetUserMedia, setFailedToGetUserMedia] = useState(false);

  useEffect(() => {
    if (navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({
          audio: true,
        })
        .then((stream) => {
          init(stream);
        })
        .catch((err) => {
          alert("Unable to access audio.\n\n" + err);
          console.log("The following error occurred: " + err);
          setFailedToGetUserMedia(true);
        });
    } else {
      setFailedToGetUserMedia(true);
    }
  }, [listening.current]);

  const toggleBtn = () => {
    listening.current ? endRecording() : beginRecording();
  };

  const beginRecording = () => {
    if (failedToGetUserMedia) return;
    recBuffers.current = [];
    setRecLength(0);
    listening.current = true;
    setTime(
      setTimeout(() => {
        endRecording();
      }, 5000)
    );
  };

  const endRecording = async () => {
    clearTimeout(time);
    setTime(null);
    const wav = exportWAV();
    console.log(wav);
    const formData = new FormData();
    formData.append("file", wav);

    const { data }: any = await api(formData);
    console.log(data);
  };

  const init = (stream: any) => {
    let audioContext = new AudioContext();
    let source = audioContext.createMediaStreamSource(stream);
    let context: any = source.context;
    let node = (
      context.createScriptProcessor || context.createJavaScriptNode
    ).call(context, 4096, numChannels, numChannels);
    node.onaudioprocess = (e: any) => {
      if (!listening.current) return;

      recBuffers.current.push([...e.inputBuffer.getChannelData(0)]);

      setRecLength((oldLength) => {
        return oldLength + recBuffers.current[0].length;
      });
    };
    source.connect(node);
    node.connect(context.destination);
  };

  const mergeBuffers = (buffers: any, len: any) => {
    let result = new Float32Array(len);
    let offset = 0;
    for (var i = 0; i < buffers.length; i++) {
      result.set(buffers[i], offset);
      offset += buffers[i].length;
    }
    return result;
  };

  const interleave = (inputL: any, inputR: any) => {
    let len = inputL.length + inputR.length;
    let result = new Float32Array(len);

    let index = 0;
    let inputIndex = 0;

    while (index < len) {
      result[index++] = inputL[inputIndex];
      result[index++] = inputR[inputIndex];
      inputIndex++;
    }

    return result;
  };

  const exportWAV = () => {
    let buffers = [];
    buffers.push(mergeBuffers(recBuffers.current, recLength));
    console.log(buffers);
    let interleaved =
      numChannels === 2 ? interleave(buffers[0], buffers[1]) : buffers[0];
    let dataView = encodeWAV(interleaved);
    let blob: any = new Blob([dataView], { type: "audio/wav" });
    blob.name = Math.floor(new Date().getTime() / 1000) + ".wav";
    listening.current = false;

    return blob;
  };

  const floatTo16BitPCM = (output: any, offset: any, input: any) => {
    for (var i = 0; i < input.length; i++, offset += 2) {
      var s = Math.max(-1, Math.min(1, input[i]));
      output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
  };

  const writeString = (view: any, offset: any, string: any) => {
    for (var i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  const encodeWAV = (samples: any) => {
    var buffer = new ArrayBuffer(44 + samples.length * 2);
    var view = new DataView(buffer);
    /* RIFF identifier */
    writeString(view, 0, "RIFF");
    /* file length */
    view.setUint32(4, 36 + samples.length * 2, true);
    /* RIFF type */
    writeString(view, 8, "WAVE");
    /* format chunk identifier */
    writeString(view, 12, "fmt ");
    /* format chunk length */
    view.setUint32(16, 16, true);
    /* sample format (raw) */
    view.setUint16(20, 1, true);
    /* channel count */
    view.setUint16(22, numChannels, true);
    /* sample rate */
    view.setUint32(24, 48000, true);
    /* byte rate (sample rate * block align) */
    view.setUint32(28, 48000 * 4, true);
    /* block align (channel count * bytes per sample) */
    view.setUint16(32, numChannels * 2, true);
    /* bits per sample */
    view.setUint16(34, 16, true);
    /* data chunk identifier */
    writeString(view, 36, "data");
    /* data chunk length */
    view.setUint32(40, samples.length * 2, true);

    floatTo16BitPCM(view, 44, samples);

    return view;
  };

  return (
    <>
      <h1>리액트</h1>
      <button onClick={toggleBtn}>녹음버튼</button>
      <button onClick={() => console.log(listening.current)}>dafds</button>
    </>
  );
};

export default AudioRecord;
