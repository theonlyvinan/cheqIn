import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Smile, AlertCircle, Clock, ChevronRight, Heart, Activity, Phone, PhoneOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import SentimentChart from "@/components/SentimentChart";
import { RealtimeChat } from "@/utils/RealtimeAudio";
import logo from "@/assets/cheqin-logo.png";
import radiantIcon from "@/assets/radiant.png";
import brightIcon from "@/assets/bright.png";
import steadyIcon from "@/assets/steady.png";
import dimIcon from "@/assets/dim.png";
import lowIcon from "@/assets/low.png";

type SessionStatus = 'processing' | 'completed';

interface CheckInSession {
  id: string;
  timestamp: string;
  transcript: string;
  sentiment: {
    label: string;
    score: number;
    mood_rating: number;
    mental_health_score?: number;
    physical_health_score?: number;
    overall_score?: number;
    emotions: any;
    highlights?: string[];
    concerns?: string[];
  };
  status: SessionStatus;
}

const CheckIn = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [sentiment, setSentiment] = useState<any>(null);
  const [conversationTranscript, setConversationTranscript] = useState<string[]>([]);
  const [currentText, setCurrentText] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [sessions, setSessions] = useState<CheckInSession[]>([
    {
      id: 'sample-1',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      transcript: "I had a wonderful day! Went for a walk in the park, the weather was beautiful, and I met my friend Sarah for coffee. I'm feeling energized and grateful.",
      sentiment: {
        label: 'very_positive',
        score: 0.92,
        mood_rating: 9,
        mental_health_score: 5,
        physical_health_score: 5,
        overall_score: 5,
        emotions: { joy: 0.85, contentment: 0.78 },
        highlights: ['Park walk', 'Coffee with friend', 'Beautiful weather'],
        concerns: []
      },
      status: 'completed'
    },
    {
      id: 'sample-2',
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      transcript: "Today was okay. Did some light reading and watched TV. Nothing special. Feeling a bit tired.",
      sentiment: {
        label: 'neutral',
        score: 0.1,
        mood_rating: 5,
        mental_health_score: 2,
        physical_health_score: 2,
        overall_score: 2,
        emotions: { calm: 0.5, fatigue: 0.4 },
        highlights: ['Reading', 'Relaxing'],
        concerns: ['Feeling tired']
      },
      status: 'completed'
    },
    {
      id: 'sample-3',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      transcript: "Today was a really good day! Felt energetic, did some gardening, and video called with my grandchildren. They showed me their school projects!",
      sentiment: {
        label: 'very_positive',
        score: 0.88,
        mood_rating: 8,
        mental_health_score: 4,
        physical_health_score: 4,
        overall_score: 4,
        emotions: { joy: 0.82, energy: 0.75 },
        highlights: ['Gardening', 'Family connection', 'Grandchildren'],
        concerns: []
      },
      status: 'completed'
    },
    {
      id: 'sample-4',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      transcript: "Had a quiet day at home. Called my sister and caught up on some shows. Feeling calm and content.",
      sentiment: {
        label: 'neutral',
        score: 0.3,
        mood_rating: 7,
        mental_health_score: 3,
        physical_health_score: 3,
        overall_score: 3,
        emotions: { contentment: 0.6 },
        highlights: ['Family call', 'Relaxation'],
        concerns: []
      },
      status: 'completed'
    },
    {
      id: 'sample-5',
      timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      transcript: "Felt really energetic today! Went grocery shopping and even did some cleaning. Very productive day!",
      sentiment: {
        label: 'very_positive',
        score: 0.95,
        mood_rating: 9,
        mental_health_score: 5,
        physical_health_score: 4,
        overall_score: 4.5,
        emotions: { energy: 0.88, satisfaction: 0.85 },
        highlights: ['Productive day', 'Shopping', 'Feeling energetic'],
        concerns: []
      },
      status: 'completed'
    }
  ]);
  const [selectedSession, setSelectedSession] = useState<CheckInSession | null>(null);
  const chatRef = useRef<RealtimeChat | null>(null);
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

  const handleRealtimeMessage = (event: any) => {
    console.log('Received event:', event.type);
    
    switch (event.type) {
      case 'session.created':
        console.log('Session created');
        setIsInitializing(false);
        setIsConnected(true);
        toast({
          title: "Connected to Mira",
          description: "Natural conversation started. Just speak naturally!",
        });
        break;
        
      case 'conversation.item.input_audio_transcription.completed':
        // User's speech transcribed
        const userText = event.transcript;
        console.log('User said:', userText);
        setConversationTranscript(prev => [...prev, `User: ${userText}`]);
        break;
        
      case 'response.audio_transcript.delta':
        // AI speaking (partial transcript)
        setCurrentText(prev => prev + event.delta);
        setIsSpeaking(true);
        break;
        
      case 'response.audio_transcript.done':
        // AI finished speaking
        const aiText = event.transcript;
        console.log('AI said:', aiText);
        setConversationTranscript(prev => [...prev, `Mira: ${aiText}`]);
        setCurrentText("");
        break;
        
      case 'response.audio.delta':
        // AI is generating audio
        setIsSpeaking(true);
        break;
        
      case 'response.audio.done':
        // AI finished generating audio
        setIsSpeaking(false);
        break;
        
      case 'response.done':
        // Check if conversation should end (usually after 5-7 exchanges)
        const userMessages = conversationTranscript.filter(t => t.startsWith('User:')).length;
        if (userMessages >= 6) {
          setTimeout(() => {
            endConversation();
          }, 2000);
        }
        break;
        
      case 'error':
        console.error('Realtime error:', event.error);
        toast({
          title: "Connection Error",
          description: event.error.message || "Something went wrong",
          variant: "destructive",
        });
        break;
    }
  };

  const startConversation = async () => {
    try {
      setIsInitializing(true);
      setTranscript("");
      setSentiment(null);
      setConversationTranscript([]);
      setCurrentText("");
      
      // Request microphone permission first
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      chatRef.current = new RealtimeChat(handleRealtimeMessage);
      await chatRef.current.init();
      
    } catch (error) {
      console.error('Error starting conversation:', error);
      setIsInitializing(false);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to start conversation',
        variant: "destructive",
      });
    }
  };

  const endConversation = async () => {
    if (!chatRef.current) return;
    
    chatRef.current.disconnect();
    setIsConnected(false);
    setIsSpeaking(false);
    
    // Compile full transcript
    const fullTranscript = conversationTranscript
      .filter(t => t.startsWith('User:'))
      .map(t => t.replace('User: ', ''))
      .join(' ');
    
    if (!fullTranscript.trim()) {
      toast({
        title: "No conversation recorded",
        description: "Please try again",
        variant: "destructive",
      });
      setConversationTranscript([]);
      return;
    }
    
    setTranscript(fullTranscript);

    // Analyze sentiment
    try {
      const { data: sentimentData, error: sentimentError } = await supabase.functions.invoke(
        'analyze-sentiment',
        { body: { text: fullTranscript } }
      );

      if (sentimentError) throw sentimentError;
      
      setSentiment(sentimentData);

      // Create new session
      const newSession: CheckInSession = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        transcript: fullTranscript,
        sentiment: {
          label: sentimentData.sentiment_label,
          score: sentimentData.sentiment_score,
          mood_rating: sentimentData.mood_rating,
          mental_health_score: sentimentData.mental_health_score,
          physical_health_score: sentimentData.physical_health_score,
          overall_score: sentimentData.overall_score,
          emotions: sentimentData.emotions,
          highlights: sentimentData.highlights || [],
          concerns: sentimentData.concerns || []
        },
        status: 'completed'
      };

      setSessions(prev => [newSession, ...prev]);

      // Save to database
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error: insertError } = await supabase
        .from('check_ins')
        .insert({
          user_id: user!.id,
          transcript: fullTranscript,
          sentiment_score: sentimentData.sentiment_score,
          sentiment_label: sentimentData.sentiment_label,
          emotions: sentimentData.emotions,
          mood_rating: sentimentData.mood_rating,
          mental_health_score: sentimentData.mental_health_score,
          physical_health_score: sentimentData.physical_health_score,
          overall_score: sentimentData.overall_score,
          mental_indicators: sentimentData.mental_indicators || [],
          physical_indicators: sentimentData.physical_indicators || [],
        });

      if (insertError) {
        console.error('Error saving check-in:', insertError);
      }

      toast({
        title: "Check-in complete!",
        description: "Thank you for sharing with me today.",
      });
      
      setConversationTranscript([]);
    } catch (error) {
      console.error('Error processing conversation:', error);
      toast({
        title: "Error",
        description: "Failed to process conversation",
        variant: "destructive",
      });
    }
  };

  const getSentimentIcon = (label: string) => {
    switch (label) {
      case 'very_positive':
        return <Smile className="w-5 h-5 text-green-600" />;
      case 'neutral':
        return <Activity className="w-5 h-5 text-yellow-600" />;
      case 'concerned':
        return <AlertCircle className="w-5 h-5 text-orange-600" />;
      default:
        return <Activity className="w-5 h-5 text-gray-600" />;
    }
  };

  const getOverallScoreLabel = (score: number) => {
    if (score >= 4.5) return 'Radiant';
    if (score >= 3.5) return 'Bright';
    if (score >= 2.5) return 'Steady';
    if (score >= 1.5) return 'Dim';
    return 'Low';
  };

  const getOverallScoreIcon = (score: number) => {
    if (score >= 4.5) return radiantIcon;
    if (score >= 3.5) return brightIcon;
    if (score >= 2.5) return steadyIcon;
    if (score >= 1.5) return dimIcon;
    return lowIcon;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return `${Math.floor(diffInHours / 24)} days ago`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-accent/10 p-4 md:p-8 space-y-8">
      {/* Header */}
      <div className="max-w-4xl mx-auto text-center space-y-6">
        {/* Logo + Text Combined with 3D Effect */}
        <div className="flex flex-col items-center gap-2 group perspective-1000">
          <img 
            src={logo}
            alt="Cheq-In Logo" 
            id="checkin-logo"
            className="w-24 md:w-32 h-auto transition-all duration-500 cursor-pointer"
            style={{ 
              filter: 'drop-shadow(0 0 30px hsl(190 85% 45% / 0.8)) drop-shadow(0 0 60px hsl(190 85% 45% / 0.5))',
              transform: 'rotateY(0deg) rotateX(0deg)',
              transformStyle: 'preserve-3d',
              transition: 'transform 0.5s ease-out',
              animation: 'glow-pulse 3s ease-in-out infinite'
            }}
          />
          <h1 
            className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground via-foreground to-accent bg-clip-text text-transparent cursor-pointer"
            onMouseEnter={() => {
              const logo = document.getElementById('checkin-logo');
              if (logo) {
                logo.style.animation = 'pulse 1s ease-in-out infinite';
              }
            }}
            onMouseLeave={() => {
              const logo = document.getElementById('checkin-logo');
              if (logo) {
                logo.style.animation = 'glow-pulse 3s ease-in-out infinite';
              }
            }}
          >
            Cheq-In
          </h1>
        </div>
        
        <style dangerouslySetInnerHTML={{ __html: `
          .perspective-1000 {
            perspective: 1000px;
          }
          #checkin-logo {
            transform-style: preserve-3d;
          }
          #checkin-logo:hover {
            transform: rotateY(15deg) rotateX(5deg) scale(1.15);
            filter: drop-shadow(0 10px 20px hsl(190 85% 45% / 0.5));
          }
          @keyframes glow-pulse {
            0%, 100% {
              filter: drop-shadow(0 0 30px hsl(190 85% 45% / 0.8)) drop-shadow(0 0 60px hsl(190 85% 45% / 0.5));
            }
            50% {
              filter: drop-shadow(0 0 50px hsl(190 85% 45% / 1)) drop-shadow(0 0 100px hsl(190 85% 45% / 0.8));
            }
          }
        `}} />
        
        <div className="flex items-center justify-center gap-2 text-xl md:text-2xl font-semibold text-primary">
          <Heart className="w-6 h-6" />
          <span>Daily Check-In with Mira</span>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Have a natural conversation with Mira. Just speak naturally - no buttons to press!
        </p>
      </div>

      {/* Connection Status */}
      {isConnected && (
        <Card className="max-w-2xl mx-auto p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isSpeaking ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`} />
                <p className="text-sm font-medium">
                  {isSpeaking ? "Mira is speaking..." : "Listening..."}
                </p>
              </div>
            </div>
            {currentText && (
              <div className="p-3 bg-background/60 rounded-lg">
                <p className="text-sm">{currentText}</p>
              </div>
            )}
            {conversationTranscript.length > 0 && (
              <div className="mt-4 max-h-40 overflow-y-auto space-y-2">
                {conversationTranscript.slice(-4).map((text, idx) => (
                  <p key={idx} className="text-xs text-muted-foreground">
                    {text}
                  </p>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Main Button */}
      <div className="max-w-2xl mx-auto flex justify-center">
        <Button
          size="lg"
          onClick={isConnected ? endConversation : startConversation}
          disabled={isInitializing}
          className={`w-40 h-40 rounded-full shadow-[0_0_30px_rgba(0,0,0,0.4)] transition-all ${
            isConnected 
              ? 'bg-red-500 hover:bg-red-600 text-white' 
              : isInitializing
              ? 'bg-gray-500'
              : 'bg-primary hover:bg-primary/90 text-white'
          }`}
        >
          {isInitializing ? (
            <Loader2 className="w-24 h-24 animate-spin" />
          ) : isConnected ? (
            <PhoneOff className="w-24 h-24" />
          ) : (
            <Phone className="w-24 h-24" />
          )}
        </Button>
      </div>

      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          {isInitializing 
            ? "Connecting to Mira..." 
            : isConnected 
            ? "Tap to end conversation" 
            : "Tap to start your daily check-in"}
        </p>
      </div>

      {/* Results */}
      {transcript && sentiment && (
        <Card className="max-w-2xl mx-auto p-6 space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm">{transcript}</p>
          </div>

          <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg">
            <div className="flex items-center gap-2">
              {getSentimentIcon(sentiment.sentiment_label)}
              <span className="text-sm capitalize">{sentiment.sentiment_label.replace('_', ' ')}</span>
            </div>
            <span className="text-sm font-medium">Mood: {sentiment.mood_rating}/10</span>
          </div>

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

      {/* Sentiment Chart */}
      {sessions.filter(s => s.status === 'completed').length > 0 && (
        <div className="max-w-2xl mx-auto">
          <SentimentChart sessions={sessions.filter(s => s.status === 'completed')} />
        </div>
      )}

      {/* Recent Check-Ins */}
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
                className={`p-4 bg-transparent border border-black rounded-lg shadow-none ${session.status === 'completed' ? 'cursor-pointer' : ''}`}
                onClick={() => session.status === 'completed' && setSelectedSession(session)}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs text-muted-foreground">{formatTimestamp(session.timestamp)}</div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{getOverallScoreLabel(session.sentiment.overall_score || 3)}</span>
                          <img src={getOverallScoreIcon(session.sentiment.overall_score || 3)} alt="" className="w-6 h-6" />
                        </div>
                      </div>
                      <p className="text-sm line-clamp-2 mb-3">{session.transcript}</p>
                      
                      {/* Scores */}
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="p-2 rounded text-center">
                          <p className="text-xs text-muted-foreground">Mental</p>
                          <p className="text-sm font-semibold">{session.sentiment.mental_health_score}/5</p>
                        </div>
                        <div className="p-2 rounded text-center">
                          <p className="text-xs text-muted-foreground">Physical</p>
                          <p className="text-sm font-semibold">{session.sentiment.physical_health_score}/5</p>
                        </div>
                        <div className="p-2 rounded text-center">
                          <p className="text-xs text-muted-foreground">Overall</p>
                          <p className="text-sm font-semibold">{session.sentiment.overall_score?.toFixed(1)}/5</p>
                        </div>
                      </div>
                      
                      {/* Highlights */}
                      {session.sentiment.highlights && session.sentiment.highlights.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {session.sentiment.highlights.map((highlight, idx) => (
                            <span key={idx} className="px-3 py-1 rounded-full text-xs font-bold italic text-black">
                              {highlight}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {session.status === 'completed' && (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Session Detail Dialog */}
      <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedSession && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {getSentimentIcon(selectedSession.sentiment.label)}
                  Check-in from {formatTimestamp(selectedSession.timestamp)}
                </DialogTitle>
                <DialogDescription>
                  {new Date(selectedSession.timestamp).toLocaleString()}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Transcript</h3>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm">{selectedSession.transcript}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-primary/10 rounded-lg">
                    <p className="text-xs text-muted-foreground">Mood Rating</p>
                    <p className="text-2xl font-bold">{selectedSession.sentiment.mood_rating}/10</p>
                  </div>
                  <div className="p-4 bg-primary/10 rounded-lg">
                    <p className="text-xs text-muted-foreground">Overall Score</p>
                    <p className="text-2xl font-bold">{selectedSession.sentiment.overall_score?.toFixed(1)}/5</p>
                  </div>
                  <div className="p-4 bg-primary/10 rounded-lg">
                    <p className="text-xs text-muted-foreground">Mental Health</p>
                    <p className="text-2xl font-bold">{selectedSession.sentiment.mental_health_score}/5</p>
                  </div>
                  <div className="p-4 bg-primary/10 rounded-lg">
                    <p className="text-xs text-muted-foreground">Physical Health</p>
                    <p className="text-2xl font-bold">{selectedSession.sentiment.physical_health_score}/5</p>
                  </div>
                </div>

                {selectedSession.sentiment.highlights && selectedSession.sentiment.highlights.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Highlights</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedSession.sentiment.highlights.map((highlight, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {highlight}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedSession.sentiment.concerns && selectedSession.sentiment.concerns.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Concerns</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedSession.sentiment.concerns.map((concern, idx) => (
                        <Badge key={idx} variant="destructive" className="text-xs">
                          {concern}
                        </Badge>
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
