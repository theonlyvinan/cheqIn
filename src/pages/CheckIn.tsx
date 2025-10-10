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
    // Example: Concerned session
    {
      id: '2',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      transcript: "My arm has been hurting since yesterday. It's a dull ache that gets worse when I try to lift things. I took some pain medication but it didn't help much. Also feeling a bit tired and worried about it.",
      sentiment: {
        label: 'concerned',
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
      transcript: 'Today I spent time with my grandchildren and we baked cookies together. The recipe was a bit tricky but we managed to make it work.',
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

    if (mood === 'very_positive') {
      return "You sound wonderful today! It's lovely to hear such positive energy. Keep up the great spirit!";
    } else if (mood === 'neutral') {
      return "Thanks for sharing. How about we make today a little brighter? Is there something nice you're looking forward to?";
    } else if (concerns.length > 0) {
      return `I noticed you mentioned ${concerns[0]}. Would you like to talk more about that? Remember, I'm here to listen.`;
    } else {
      return "I'm here for you. It's okay to have these days. Want to tell me what's been on your mind?";
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
        return 'bg-blue-500/10 border-blue-500/20';
      case 'neutral':
        return 'bg-gray-300/10 border-gray-300/20';
      case 'concerned':
        return 'bg-red-300/10 border-red-300/20';
      default:
        return 'bg-gray-500/10 border-gray-500/20';
    }
  };

  const getSentimentIcon = (label: string) => {
    switch (label) {
      case 'very_positive':
        return <Smile className="w-5 h-5" />;
      case 'concerned':
        return <AlertCircle className="w-5 h-5" />;
      case 'neutral':
        return <Heart className="w-5 h-5" />;
      default:
        return <Heart className="w-5 h-5" />;
    }
  };

  const getMoodColor = (label: string) => {
    switch (label) {
      case 'very_positive':
        return 'bg-green-400 text-black';
      case 'concerned':
        return 'bg-red-300 text-black';
      case 'neutral':
        return 'bg-gray-300 text-black';
      default:
        return 'bg-gray-300 text-black';
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
    <div className="min-h-screen p-4 md:p-8 page-container">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold">
            How Are You Feeling?
          </h1>
          <p className="text-lg text-muted-foreground">
            {isRecording ? "Listening..." : "Tap to start your check-in"}
          </p>
        </div>

        {/* Recording Section */}
        <div className="max-w-2xl mx-auto">
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <Button
                size="lg"
                variant={isRecording ? "destructive" : "default"}
                className="w-40 h-40 rounded-full bg-black hover:bg-black/90 text-white"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="w-24 h-24 animate-spin" />
                ) : isRecording ? (
                  <MicOff className="w-24 h-24" />
                ) : (
                  <Mic className="w-24 h-24" />
                )}
              </Button>
              
              {isProcessing && (
                <p className="text-sm text-muted-foreground">Analyzing...</p>
              )}
            </div>

            {transcript && (
              <Card className="p-6 space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm">{transcript}</p>
                </div>

                {sentiment && (
                  <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg">
                    <div className="flex items-center gap-2">
                      {getSentimentIcon(sentiment.sentiment_label)}
                      <span className="text-sm capitalize">{sentiment.sentiment_label.replace('_', ' ')}</span>
                    </div>
                    <span className="text-sm font-medium">Mood: {sentiment.mood_rating}/10</span>
                  </div>
                )}

                <Button 
                  variant="outline" 
                  onClick={() => navigate("/")}
                  className="w-full"
                >
                  Back to Home
                </Button>
              </Card>
            )}

            {!transcript && (
              <div className="flex justify-center">
                <Button 
                  variant="outline" 
                  onClick={() => navigate("/")}
                >
                  Back to Home
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Recent Check-Ins - Compact */}
        {sessions.length > 0 && (
          <div className="max-w-2xl mx-auto space-y-3">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Recent Check-Ins
            </h2>
            
            <div className="space-y-3">
              {sessions.slice(0, 3).map((session) => (
                <Card
                  key={session.id}
                  className={`p-4 ${session.status === 'completed' ? `cursor-pointer hover:bg-accent/5 border ${getSentimentColor(session.sentiment.label)}` : 'bg-black text-white border-black'} transition-colors`}
                  onClick={() => session.status === 'completed' && setSelectedSession(session)}
                >
                  {session.status === 'processing' ? (
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="text-xs text-white/70">{formatTimestamp(session.timestamp)}</div>
                            <Badge className="bg-white text-black text-xs">
                              <Loader2 className="w-3 h-3 animate-spin mr-1" />
                              Processing
                            </Badge>
                          </div>
                          <div className="text-sm mt-1 line-clamp-2 text-white">{session.transcript}</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="text-xs text-muted-foreground">{formatTimestamp(session.timestamp)}</div>
                          <div className="text-sm font-medium mt-1 line-clamp-2">{session.transcript}</div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      </div>
                      
                      {/* Emotion Analysis Summary */}
                      <div className="flex items-center gap-4 pt-2 border-t">
                        <div className="flex items-center gap-2">
                          {getSentimentIcon(session.sentiment.label)}
                          <span className="text-xs capitalize">{session.sentiment.label.replace('_', ' ')}</span>
                        </div>
                        <Badge className={`text-xs ${getMoodColor(session.sentiment.label)}`}>
                          Mood: {session.sentiment.mood_rating}/10
                        </Badge>
                      </div>
                      
                      {/* Key Findings */}
                      {(session.sentiment.highlights?.length > 0 || session.sentiment.concerns?.length > 0) && (
                        <div className="flex flex-wrap gap-2">
                          {session.sentiment.highlights?.slice(0, 2).map((highlight, idx) => (
                            <Badge key={`h-${idx}`} variant="outline" className="text-xs bg-primary/5">
                              {highlight}
                            </Badge>
                          ))}
                          {session.sentiment.concerns?.slice(0, 2).map((concern, idx) => (
                            <Badge key={`c-${idx}`} variant="outline" className="text-xs bg-destructive/5 text-destructive">
                              {concern}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Session Detail Dialog */}
      <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedSession && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">Check-In Details</DialogTitle>
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
                    <Card className="p-4 text-center">
                      <div className="text-sm text-muted-foreground mb-1">Mood</div>
                      <div className="text-2xl font-bold">
                        {selectedSession.sentiment.mood_rating}/10
                      </div>
                    </Card>
                    <Card className="p-4 text-center">
                      <div className="text-sm text-muted-foreground mb-1">Status</div>
                      <div className="text-lg font-bold capitalize">
                        {selectedSession.sentiment.label.replace('_', ' ')}
                      </div>
                    </Card>
                    <Card className="p-4 text-center">
                      <div className="text-sm text-muted-foreground mb-1">Score</div>
                      <div className="text-2xl font-bold">
                        {(selectedSession.sentiment.score * 100).toFixed(0)}%
                      </div>
                    </Card>
                  </div>
                </div>

                {/* Highlights */}
                {selectedSession.sentiment.highlights && selectedSession.sentiment.highlights.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <Smile className="w-5 h-5" />
                      Key Highlights
                    </h3>
                    <div className="space-y-2">
                      {selectedSession.sentiment.highlights.map((highlight, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg">
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
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
                      <AlertCircle className="w-5 h-5" />
                      Areas of Concern
                    </h3>
                    <div className="space-y-2">
                      {selectedSession.sentiment.concerns.map((concern, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-destructive/10 rounded-lg">
                          <AlertCircle className="w-4 h-4" />
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
