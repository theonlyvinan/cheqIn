import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const CheckIn = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [sentiment, setSentiment] = useState<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);

      toast({
        title: "Recording started",
        description: "Speak naturally about your day...",
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Error",
        description: "Could not access microphone",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        const base64Audio = reader.result?.toString().split(',')[1];
        
        // Transcribe audio
        const { data: transcriptData, error: transcriptError } = await supabase.functions.invoke(
          'voice-to-text',
          { body: { audio: base64Audio } }
        );

        if (transcriptError) throw transcriptError;
        
        const transcribedText = transcriptData.text;
        setTranscript(transcribedText);

        // Analyze sentiment
        const { data: sentimentData, error: sentimentError } = await supabase.functions.invoke(
          'analyze-sentiment',
          { body: { text: transcribedText } }
        );

        if (sentimentError) throw sentimentError;
        
        setSentiment(sentimentData);

        // Save check-in to database
        const { data: { user } } = await supabase.auth.getUser();
        
        const { error: insertError } = await supabase
          .from('check_ins')
          .insert({
            user_id: user!.id,
            transcript: transcribedText,
            sentiment_score: sentimentData.sentiment_score,
            sentiment_label: sentimentData.sentiment_label,
            emotions: sentimentData.emotions,
            mood_rating: sentimentData.mood_rating,
          });

        if (insertError) throw insertError;

        toast({
          title: "Check-in saved!",
          description: "Your wellness data has been recorded.",
        });

        // Speak response
        const response = generateResponse(sentimentData);
        await speakResponse(response);
      };
    } catch (error) {
      console.error('Error processing audio:', error);
      toast({
        title: "Error",
        description: "Could not process your check-in",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const generateResponse = (sentimentData: any) => {
    const mood = sentimentData.sentiment_label;
    const concerns = sentimentData.concerns || [];

    if (mood === 'very_positive' || mood === 'positive') {
      return "You sound wonderful today! It's lovely to hear such positive energy. Keep up the great spirit!";
    } else if (mood === 'neutral') {
      return "Thanks for sharing. How about we make today a little brighter? Is there something nice you're looking forward to?";
    } else if (concerns.length > 0) {
      return `I noticed you mentioned ${concerns[0]}. Would you like to talk more about that? Remember, I'm here to listen.`;
    } else {
      return "I'm sorry you're feeling down. It's okay to have these days. Want to tell me what's been on your mind?";
    }
  };

  const speakResponse = async (text: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text }
      });

      if (error) throw error;

      const audio = new Audio(`data:audio/mpeg;base64,${data.audioContent}`);
      audio.play();
    } catch (error) {
      console.error('Error playing audio response:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full p-12 space-y-8 text-center">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold">Daily Check-In</h1>
          <p className="text-xl text-muted-foreground">
            {isRecording ? "Listening..." : "Tell me about your day"}
          </p>
        </div>

        <div className="flex justify-center">
          <Button
            size="lg"
            variant={isRecording ? "destructive" : "accent"}
            className="w-32 h-32 rounded-full"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="w-16 h-16 animate-spin" />
            ) : isRecording ? (
              <MicOff className="w-16 h-16" />
            ) : (
              <Mic className="w-16 h-16" />
            )}
          </Button>
        </div>

        {transcript && (
          <div className="space-y-4 text-left">
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">What you said:</h3>
              <p className="text-muted-foreground">{transcript}</p>
            </div>

            {sentiment && (
              <div className="p-4 bg-accent/10 rounded-lg">
                <h3 className="font-semibold mb-2">Mood Analysis:</h3>
                <div className="flex gap-4 flex-wrap">
                  <div className="text-sm">
                    <span className="font-medium">Overall: </span>
                    <span className="capitalize">{sentiment.sentiment_label}</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Rating: </span>
                    <span>{sentiment.mood_rating}/10</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <Button variant="outline" onClick={() => navigate("/")}>
          Back to Home
        </Button>
      </Card>
    </div>
  );
};

export default CheckIn;
