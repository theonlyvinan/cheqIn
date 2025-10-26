import { supabase } from "@/integrations/supabase/client";

export class AudioRecorder {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;

  constructor(private onAudioData: (audioData: Float32Array) => void) {}

  async start() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      this.audioContext = new AudioContext({
        sampleRate: 24000,
      });
      
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      this.processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        this.onAudioData(new Float32Array(inputData));
      };
      
      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      throw error;
    }
  }

  stop() {
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

export class RealtimeChat {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private audioEl: HTMLAudioElement;
  private recorder: AudioRecorder | null = null;

  constructor(private onMessage: (message: any) => void) {
    this.audioEl = document.createElement("audio");
    this.audioEl.autoplay = true;
  }

  async init() {
    try {
      console.log('Initializing realtime chat...');
      
      // Get ephemeral token from our Supabase Edge Function
      const { data, error } = await supabase.functions.invoke("realtime-token");
      
      if (error) {
        console.error('Error getting token:', error);
        throw error;
      }
      
      if (!data?.client_secret?.value) {
        throw new Error("Failed to get ephemeral token");
      }

      const EPHEMERAL_KEY = data.client_secret.value;
      console.log('Got ephemeral token');

      // Create peer connection
      this.pc = new RTCPeerConnection();
      
      // ICE connection state logs
      this.pc.oniceconnectionstatechange = () => {
        console.log('ICE state:', this.pc?.iceConnectionState);
      };

      // Set up remote audio
      this.pc.ontrack = e => {
        console.log('Received audio track');
        this.audioEl.srcObject = e.streams[0];
        try {
          if (!document.body.contains(this.audioEl)) {
            this.audioEl.setAttribute('playsinline', 'true');
            this.audioEl.muted = false;
            this.audioEl.style.display = 'none';
            document.body.appendChild(this.audioEl);
          }
          const playPromise = this.audioEl.play();
          if (playPromise && typeof (playPromise as any).then === 'function') {
            (playPromise as Promise<void>).catch(err => {
              console.warn('Autoplay blocked, will resume on next user gesture:', err);
            });
          }
        } catch (err) {
          console.error('Error attaching/playing remote audio element:', err);
        }
      };

      // Add local audio track with specific constraints
      const ms = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      console.log('Microphone stream acquired:', ms.getAudioTracks()[0].getSettings());
      this.pc.addTrack(ms.getTracks()[0]);
      console.log('Added local audio track');

      // Set up data channel
      this.dc = this.pc.createDataChannel("oai-events");
      
      this.dc.addEventListener("open", () => {
        console.log('Data channel opened');
        // Send session config and wait for session.updated before proceeding
        setTimeout(() => {
          if (this.dc && this.dc.readyState === 'open') {
            console.log('Sending session.update for audio config');
            this.dc.send(JSON.stringify({
              type: 'session.update',
              session: {
                modalities: ['audio', 'text'],
                turn_detection: {
                  type: 'server_vad',
                  threshold: 0.5,
                  prefix_padding_ms: 300,
                  silence_duration_ms: 800,
                  create_response: true
                }
              }
            }));
            // After this, we wait for session.updated event before sending greeting
          }
        }, 300);
      });
      
      this.dc.addEventListener("message", (e) => {
        try {
          const event = JSON.parse(e.data);
          console.log("Received event:", event.type);
          
          // Log errors with detail
          if (event.type === 'error' || event.type.includes('failed')) {
            console.error('Realtime error detail:', event);
          }
          
          // Wait for session.updated before sending initial greeting
          if (event.type === 'session.updated') {
            console.log('Session configured, now sending initial message');
            setTimeout(() => {
              if (this.dc && this.dc.readyState === 'open') {
                console.log('Sending initial user message');
                this.dc.send(JSON.stringify({
                  type: 'conversation.item.create',
                  item: {
                    type: 'message',
                    role: 'user',
                    content: [
                      { type: 'input_text', text: 'Hello' }
                    ]
                  }
                }));

                setTimeout(() => {
                  if (this.dc && this.dc.readyState === 'open') {
                    console.log('Triggering Mira response with audio');
                    this.dc.send(JSON.stringify({
                      type: 'response.create',
                      response: { modalities: ['audio', 'text'] }
                    }));
                  }
                }, 200);
              }
            }, 100);
          }
          
          // Log Mira's text responses
          if (event.type === 'response.audio_transcript.delta') {
            console.log("🗣️ Mira says:", event.delta);
          } else if (event.type === 'response.audio_transcript.done') {
            console.log("🗣️ Mira finished saying:", event.transcript);
          } else if (event.type === 'conversation.item.created' && event.item?.role === 'assistant') {
            console.log("🗣️ Mira's message:", event.item);
          }
          
          this.onMessage(event);
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      });

      this.dc.addEventListener("error", (error) => {
        console.error('Data channel error:', error);
      });

      // Create and set local description
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      console.log('Created offer');

      // Connect to OpenAI's Realtime API
      const baseUrl = "https://api.openai.com/v1/realtime";
      const model = "gpt-4o-realtime-preview-2024-12-17";
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${EPHEMERAL_KEY}`,
          "Content-Type": "application/sdp"
        },
      });

      if (!sdpResponse.ok) {
        throw new Error(`Failed to connect to OpenAI: ${sdpResponse.status}`);
      }

      const answer = {
        type: "answer" as RTCSdpType,
        sdp: await sdpResponse.text(),
      };
      
      await this.pc.setRemoteDescription(answer);
      console.log("WebRTC connection established");

    } catch (error) {
      console.error("Error initializing chat:", error);
      throw error;
    }
  }

  private encodeAudioData(float32Array: Float32Array): string {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    
    const uint8Array = new Uint8Array(int16Array.buffer);
    let binary = '';
    const chunkSize = 0x8000;
    
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    
    return btoa(binary);
  }

  async sendMessage(text: string) {
    if (!this.dc || this.dc.readyState !== 'open') {
      throw new Error('Data channel not ready');
    }

    const event = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text
          }
        ]
      }
    };

    this.dc.send(JSON.stringify(event));
    this.dc.send(JSON.stringify({type: 'response.create'}));
  }

  disconnect() {
    console.log('Disconnecting realtime chat...');
    this.recorder?.stop();
    this.dc?.close();
    this.pc?.close();
    this.audioEl.srcObject = null;
  }
}
