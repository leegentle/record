import axios from "axios";

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

  let recBuffers: any = [];
  let recLength: any = 0;
  let numChannels: any = 1;
  let listening: boolean = false;
  let timeout: any = null;
  let constraints: any = {
    audio: true,
  };
  let failedToGetUserMedia: boolean = false;

  if (navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then((stream) => {
        init(stream);
      })
      .catch((err) => {
        alert("Unable to access audio.\n\n" + err);
        console.log("The following error occurred: " + err);
        failedToGetUserMedia = true;
      });
  } else failedToGetUserMedia = true;

  const toggleBtn = () => {
    listening ? endRecording() : beginRecording();
  };

  const beginRecording = () => {
    if (failedToGetUserMedia) return;
    recBuffers = [];
    recLength = 0;
    listening = true;
    timeout = setTimeout(() => {
      endRecording();
    }, 5000);
  };

  const endRecording = async () => {
    clearTimeout(timeout);
    timeout = null;
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
      if (!listening) return;

      for (var i = 0; i < numChannels; i++) {
        recBuffers.push([...e.inputBuffer.getChannelData(i)]);
      }
      recLength += recBuffers[0].length;
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
    buffers.push(mergeBuffers(recBuffers, recLength));
    console.log(buffers);
    let interleaved =
      numChannels === 2 ? interleave(buffers[0], buffers[1]) : buffers[0];
    let dataView = encodeWAV(interleaved);
    let blob: any = new Blob([dataView], { type: "audio/wav" });
    blob.name = Math.floor(new Date().getTime() / 1000) + ".wav";

    listening = false;

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
      <h1>바닐라</h1>
      <button onClick={toggleBtn}>녹음버튼</button>
    </>
  );
};

export default AudioRecord;
