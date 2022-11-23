import React, { useState, useCallback } from "react";
import { WaveFile } from "wavefile";
import axios from "axios";

class AudioBuffer {
  sampleRate: any;
  buffer: any;
  wav: any;

  constructor(sampleRate: any) {
    this.sampleRate = sampleRate;
    this.buffer = [];
  }

  push(buffer: any) {
    // buffer.forEach((sample: any) => this.buffer.push(sample));
    this.buffer = [...this.buffer, ...buffer];
  }

  toDataUri() {
    return !!this.toWav() ? this.wav.toDataURI() : "";
  }

  toBuffer() {
    return !!this.toWav() ? this.wav.toBuffer() : undefined;
  }

  toWav() {
    return !!this.wav
      ? this.wav
      : this.buffer.length > 0
      ? this.createWav()
      : undefined;
  }

  createWav() {
    console.log(this.buffer);
    this.wav = new WaveFile();
    this.wav.fromScratch(1, this.sampleRate, "32f", this.buffer);
    this.wav.toSampleRate(16000);
    this.wav.toBitDepth("16");
    return this.wav;
  }

  toBlob = () => {
    const blob = new Blob([this.wav.toBuffer()], { type: "audio/wav" });
    return blob;
  };
}

const AudioRecord = () => {
  const [stream, setStream] = useState<any>();
  const [media, setMedia] = useState<any>();
  const [onRec, setOnRec] = useState(false);
  const [source, setSource] = useState<any>();
  const [analyser, setAnalyser] = useState<any>();
  const [audioUrl, setAudioUrl] = useState<any>();
  const [audioBuffer] = useState(new AudioBuffer({ sampleRate: 48000 }));

  // 음성녹음 시작
  const onRecAudio = () => {
    // 음원정보를 담은 노드를 생성하거나 음원을 실행또는 디코딩 시키는 일을 한다
    const audioCtx = new window.AudioContext();
    // 자바스크립트를 통해 음원의 진행상태에 직접접근에 사용된다.
    const analyser = audioCtx.createScriptProcessor(0, 1, 1);
    audioCtx.resume();
    audioCtx.audioWorklet.addModule("");

    setAnalyser(analyser);

    function makeSound(stream: any) {
      // 내 컴퓨터의 마이크나 다른 소스를 통해 발생한 오디오 스트림의 정보를 보여준다.
      const source = audioCtx.createMediaStreamSource(stream);
      setSource(source);
      source.connect(analyser);
      analyser.connect(audioCtx.destination);
    }

    // 마이크 사용 권한 획득
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.start();
      setStream(stream);
      setMedia(mediaRecorder);
      makeSound(stream);

      // 3분(180초) 지나면 자동으로 음성 저장 및 녹음 중지
      analyser.onaudioprocess = function (e) {
        const buffer = e.inputBuffer.getChannelData(0);

        // record(buffer);
        audioBuffer.push(buffer);

        if (e.playbackTime > 180) {
          stream.getAudioTracks().forEach(function (track) {
            track.stop();
          });
          mediaRecorder.stop();
          // 메서드가 호출 된 노드 연결 해제
          analyser.disconnect();
          audioCtx.createMediaStreamSource(stream).disconnect();

          mediaRecorder.ondataavailable = function (e) {
            setAudioUrl(e.data);
            setOnRec(false);
          };
        } else {
          setOnRec(true);
        }
      };
    });
  };

  // 음성녹음 끝
  const offRecAudio = async () => {
    // dataavailable 이벤트로 Blob 데이터에 대한 응답을 받을 수 있음
    media.ondataavailable = function (e: any) {
      console.log(e.data);
      // setAudioUrl(e.data);
      setOnRec(false);
    };

    // 모든 트랙에서 stop()을 호출해 오디오 스트림을 정지
    stream.getAudioTracks().forEach(function (track: any) {
      track.stop();
    });

    // 미디어 캡처 중지
    media.stop();
    // 메서드가 호출 된 노드 연결 해제
    analyser.disconnect();
    source.disconnect();

    // 내코드

    const result = audioBuffer.createWav();
    console.log(result);

    const formData = new FormData();
    formData.append("file", result);
    // const data = await api(formData);
    const config = {
      headers: { "content-type": "multipart/form-data" },
    };
    const data = await axios.post(
      "http://3.38.129.209:8080/stt",
      formData,
      config
    );
    console.log(data);
  };

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

  // 결과 확인
  const onSubmitAudioFile = useCallback(() => {
    if (audioUrl) {
      console.log(URL.createObjectURL(audioUrl)); // 출력된 링크에서 녹음된 오디오 확인 가능
    }
    // File 생성자를 사용해 파일로 변환
    const sound = new File([audioUrl], "soundBlob", {
      lastModified: new Date().getTime(),
      type: "audio",
    });
    console.log(sound); // File 정보 출력
  }, [audioUrl]);

  return (
    <>
      <button onClick={onRec ? offRecAudio : onRecAudio}>
        {onRec ? "정지" : "시작"}
      </button>
      <button onClick={onSubmitAudioFile}>결과 확인</button>
      <audio src={audioUrl} controls></audio>
      <audio
        src="https://indj.s3.ap-northeast-2.amazonaws.com/image/test/%EC%9D%BC%EB%B0%98%EB%82%A8%EC%97%AC_%EC%9D%BC%EB%B0%98%ED%86%B5%ED%95%A905_M_1526752256_27_%EC%A0%84%EB%9D%BC_%EC%8B%A4%EB%82%B4_07368.wav"
        controls
      ></audio>
    </>
  );
};

export default AudioRecord;
