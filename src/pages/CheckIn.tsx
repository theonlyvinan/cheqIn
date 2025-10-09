import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Loader2, Smile, AlertCircle, Clock, ChevronRight, Heart, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type SessionStatus = 'processing' | 'completed';

interface CheckInSession {
  id: string;
  timestamp: string;
  transcript: string;
  sentiment: {
    label: string;
    score: number;
    mood_rating: number;
    emotions: any;
    highlights?: string[];
    concerns?: string[];
  };
  status: SessionStatus;
}

const CheckIn = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [sentiment, setSentiment] = useState<any>(null);
  const [sessions, setSessions] = useState<CheckInSession[]>([
    // Example: Happy session
    {
      id: '1',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      transcript: "I had a wonderful day! Went for a walk in the park, the weather was beautiful, and I met my friend Sarah for coffee. I'm feeling energized and grateful.",
      sentiment: {
        label: 'very_positive',
        score: 0.92,
        mood_rating: 9,
        emotions: { joy: 0.85, contentment: 0.78 },
        highlights: ['Park walk', 'Coffee with friend', 'Beautiful weather', 'Feeling energized'],
        concerns: []
      },
      status: 'completed'
    },
    // Example: In pain session
    {
      id: '2',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      transcript: "My arm has been hurting since yesterday. It's a dull ache that gets worse when I try to lift things. I took some pain medication but it didn't help much. Also feeling a bit tired and worried about it.",
      sentiment: {
        label: 'negative',
        score: -0.65,
        mood_rating: 4,
        emotions: { pain: 0.72, worry: 0.58, fatigue: 0.45 },
        highlights: ['Arm pain reported', 'Pain when lifting', 'Medication not helping'],
        concerns: ['Persistent arm pain', 'Limited mobility', 'Fatigue']
      },
      status: 'completed'
    },
    // Example: Processing session
    {
      id: '3',
      timestamp: new Date().toISOString(),
      transcript: '',
      sentiment: {
        label: '',
        score: 0,
        mood_rating: 0,
        emotions: {}
      },
      status: 'processing'
    }
  ]);
  const [selectedSession, setSelectedSession] = useState<CheckInSession | null>(null);
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

        // Create new session
        const newSession: CheckInSession = {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          transcript: transcribedText,
          sentiment: {
            label: sentimentData.sentiment_label,
            score: sentimentData.sentiment_score,
            mood_rating: sentimentData.mood_rating,
            emotions: sentimentData.emotions,
            highlights: sentimentData.highlights || [],
            concerns: sentimentData.concerns || []
          },
          status: 'completed'
        };

        // Add to sessions (remove the processing one and add the new completed one)
        setSessions(prev => [newSession, ...prev.filter(s => s.status !== 'processing')]);

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

  const getSentimentColor = (label: string) => {
    switch (label) {
      case 'very_positive':
      case 'positive':
        return 'from-green-500 to-emerald-400';
      case 'neutral':
        return 'from-blue-500 to-cyan-400';
      case 'negative':
      case 'very_negative':
        return 'from-orange-500 to-red-400';
      default:
        return 'from-gray-500 to-gray-400';
    }
  };

  const getSentimentIcon = (label: string) => {
    switch (label) {
      case 'very_positive':
      case 'positive':
        return <Smile className="w-5 h-5" />;
      case 'negative':
      case 'very_negative':
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <Heart className="w-5 h-5" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hours ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
            Daily Check-In
          </h1>
          <p className="text-2xl text-muted-foreground">
            {isRecording ? "🎤 Listening to you..." : "Tell me about your day"}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Recording Section */}
          <Card className="p-8 space-y-8 shadow-2xl border-0" style={{ boxShadow: 'var(--glow-primary)' }}>
            <div className="flex justify-center">
              <div className={`relative ${isRecording ? 'animate-pulse' : ''}`}>
                <div className={`absolute inset-0 rounded-full blur-2xl opacity-50 ${isRecording ? 'bg-gradient-to-r from-accent via-primary to-secondary' : ''}`}></div>
                <Button
                  size="lg"
                  variant={isRecording ? "destructive" : "hero"}
                  className="relative w-40 h-40 rounded-full text-2xl"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 className="w-20 h-20 animate-spin" />
                  ) : isRecording ? (
                    <MicOff className="w-20 h-20" />
                  ) : (
                    <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                      <Mic className="w-20 h-20" />
                    </span>
                  )}
                </Button>
              </div>
            </div>

            {transcript && (
              <div className="space-y-4">
                <div className="p-6 bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl border-2 border-primary/20">
                  <h3 className="font-bold mb-3 text-lg flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    Your Message
                  </h3>
                  <p className="text-foreground leading-relaxed">{transcript}</p>
                </div>

                {sentiment && (
                  <div className={`p-6 bg-gradient-to-r ${getSentimentColor(sentiment.sentiment_label)} bg-opacity-10 rounded-2xl border-2 border-white/20`}>
                    <h3 className="font-bold mb-3 text-lg text-white flex items-center gap-2">
                      {getSentimentIcon(sentiment.sentiment_label)}
                      Mood Detected
                    </h3>
                    <div className="flex gap-6 flex-wrap text-white">
                      <div className="bg-white/20 px-4 py-2 rounded-lg">
                        <span className="font-medium">Status: </span>
                        <span className="capitalize font-bold">{sentiment.sentiment_label.replace('_', ' ')}</span>
                      </div>
                      <div className="bg-white/20 px-4 py-2 rounded-lg">
                        <span className="font-medium">Mood: </span>
                        <span className="font-bold">{sentiment.mood_rating}/10</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <Button 
              variant="outline" 
              onClick={() => navigate("/")}
              className="w-full text-lg py-6"
            >
              Back to Home
            </Button>
          </Card>

          {/* Session History */}
          <div className="space-y-4">
            <h2 className="text-3xl font-bold flex items-center gap-3">
              <Clock className="w-8 h-8 text-primary" />
              Session History
            </h2>
            
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {sessions.map((session) => (
                <Card
                  key={session.id}
                  className={`p-6 cursor-pointer transition-all duration-300 border-0 ${
                    session.status === 'processing' 
                      ? 'bg-gradient-to-r from-secondary/20 to-primary/20 animate-pulse' 
                      : 'hover:scale-102 shadow-xl'
                  }`}
                  style={session.status === 'completed' ? {
                    boxShadow: session.sentiment.label.includes('positive') 
                      ? 'var(--glow-primary)' 
                      : session.sentiment.label.includes('negative')
                      ? 'var(--glow-accent)'
                      : 'var(--glow-secondary)'
                  } : undefined}
                  onClick={() => session.status === 'completed' && setSelectedSession(session)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        {session.status === 'processing' ? (
                          <>
                            <Loader2 className="w-6 h-6 animate-spin text-secondary" />
                            <Badge className="bg-secondary text-secondary-foreground">
                              Processing...
                            </Badge>
                          </>
                        ) : (
                          <>
                            <div className={`p-2 rounded-full bg-gradient-to-r ${getSentimentColor(session.sentiment.label)}`}>
                              {getSentimentIcon(session.sentiment.label)}
                            </div>
                            <Badge className={`bg-gradient-to-r ${getSentimentColor(session.sentiment.label)} text-white border-0`}>
                              {session.sentiment.label.replace('_', ' ')}
                            </Badge>
                          </>
                        )}
                        <span className="text-sm text-muted-foreground">
                          {formatTimestamp(session.timestamp)}
                        </span>
                      </div>
                      
                      {session.status === 'completed' && (
                        <>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {session.transcript}
                          </p>
                          
                          {session.sentiment.highlights && session.sentiment.highlights.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {session.sentiment.highlights.slice(0, 2).map((highlight, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {highlight}
                                </Badge>
                              ))}
                              {session.sentiment.highlights.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{session.sentiment.highlights.length - 2} more
                                </Badge>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    
                    {session.status === 'completed' && (
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Session Details Dialog */}
      <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedSession && (
            <>
              <DialogHeader>
                <DialogTitle className="text-3xl flex items-center gap-3">
                  <div className={`p-3 rounded-full bg-gradient-to-r ${getSentimentColor(selectedSession.sentiment.label)}`}>
                    {getSentimentIcon(selectedSession.sentiment.label)}
                  </div>
                  Session Details
                </DialogTitle>
                <DialogDescription className="text-base">
                  {formatTimestamp(selectedSession.timestamp)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Transcript */}
                <div className="space-y-2">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    What You Shared
                  </h3>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="leading-relaxed">{selectedSession.transcript}</p>
                  </div>
                </div>

                {/* Sentiment Overview */}
                <div className="space-y-2">
                  <h3 className="font-bold text-lg">Emotional Analysis</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <Card className="p-4 text-center border-2 border-primary/20">
                      <div className="text-sm text-muted-foreground mb-1">Mood</div>
                      <div className="text-2xl font-bold text-primary">
                        {selectedSession.sentiment.mood_rating}/10
                      </div>
                    </Card>
                    <Card className="p-4 text-center border-2 border-accent/20">
                      <div className="text-sm text-muted-foreground mb-1">Status</div>
                      <div className="text-lg font-bold text-accent capitalize">
                        {selectedSession.sentiment.label.replace('_', ' ')}
                      </div>
                    </Card>
                    <Card className="p-4 text-center border-2 border-secondary/20">
                      <div className="text-sm text-muted-foreground mb-1">Score</div>
                      <div className="text-2xl font-bold text-secondary">
                        {(selectedSession.sentiment.score * 100).toFixed(0)}%
                      </div>
                    </Card>
                  </div>
                </div>

                {/* Highlights */}
                {selectedSession.sentiment.highlights && selectedSession.sentiment.highlights.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <Smile className="w-5 h-5 text-green-500" />
                      Key Highlights
                    </h3>
                    <div className="space-y-2">
                      {selectedSession.sentiment.highlights.map((highlight, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>{highlight}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Concerns */}
                {selectedSession.sentiment.concerns && selectedSession.sentiment.concerns.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-orange-500" />
                      Areas of Concern
                    </h3>
                    <div className="space-y-2">
                      {selectedSession.sentiment.concerns.map((concern, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                          <AlertCircle className="w-4 h-4 text-orange-500" />
                          <span>{concern}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CheckIn;
