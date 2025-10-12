import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Smile, AlertCircle, Clock, ChevronRight, Heart, Activity, Phone, PhoneOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  const [isFinalizing, setIsFinalizing] = useState(false);
  const inactivityTimerRef = useRef<number | null>(null);
  const [sessions, setSessions] = useState<CheckInSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<CheckInSession | null>(null);
  const chatRef = useRef<RealtimeChat | null>(null);
  const transcriptRef = useRef<string>("");
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    loadCheckIns();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
    }
  };

  const loadCheckIns = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load actual check-ins from database
      const { data: checkIns, error } = await supabase
        .from('check_ins')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error loading check-ins:', error);
        return;
      }

      let formattedSessions: CheckInSession[] = [];

      // Add actual database data first
      if (checkIns && checkIns.length > 0) {
        formattedSessions = checkIns.map(checkIn => ({
          id: checkIn.id,
          timestamp: checkIn.created_at,
          transcript: checkIn.transcript,
          sentiment: {
            label: checkIn.sentiment_label || 'neutral',
            score: checkIn.sentiment_score || 0,
            mood_rating: checkIn.mood_rating || 5,
            mental_health_score: checkIn.mental_health_score,
            physical_health_score: checkIn.physical_health_score,
            overall_score: checkIn.overall_score,
            emotions: checkIn.emotions || {},
            highlights: [],
            concerns: []
          },
          status: 'completed' as SessionStatus
        }));
      }

      // Add sample data at the end
      const sampleSessions: CheckInSession[] = [
        {
          id: 'sample-1',
          timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
          transcript: "Today I'm feeling pretty good. I went for a walk this morning, and the weather was nice. I'm still dealing with some back pain, but it's manageable. I took my medication as scheduled.",
          sentiment: {
            label: 'very_positive',
            score: 0.85,
            mood_rating: 8,
            mental_health_score: 4,
            physical_health_score: 3,
            overall_score: 3.5,
            emotions: { joy: 0.7, contentment: 0.8 },
            highlights: ['Went for a morning walk', 'Weather was nice'],
            concerns: ['Back pain persists']
          },
          status: 'completed'
        },
        {
          id: 'sample-2',
          timestamp: new Date(Date.now() - 3600000 * 48).toISOString(),
          transcript: "I had a rough night with limited sleep. My knees were bothering me, which made it hard to get comfortable. I'm feeling a bit tired and anxious about my doctor's appointment tomorrow.",
          sentiment: {
            label: 'concerned',
            score: 0.45,
            mood_rating: 5,
            mental_health_score: 3,
            physical_health_score: 2,
            overall_score: 2.5,
            emotions: { anxiety: 0.6, fatigue: 0.7 },
            highlights: [],
            concerns: ['Poor sleep quality', 'Knee pain', 'Anxiety about appointment']
          },
          status: 'completed'
        },
        {
          id: 'sample-3',
          timestamp: new Date(Date.now() - 3600000 * 72).toISOString(),
          transcript: "Had a wonderful day! My grandkids visited, and we had a great time together. I felt energetic and happy. No major pain issues today, which is a blessing.",
          sentiment: {
            label: 'very_positive',
            score: 0.92,
            mood_rating: 9,
            mental_health_score: 5,
            physical_health_score: 4,
            overall_score: 4.5,
            emotions: { joy: 0.9, love: 0.85, contentment: 0.95 },
            highlights: ['Family visit', 'High energy', 'Minimal pain'],
            concerns: []
          },
          status: 'completed'
        }
      ];

      // Combine actual data (first) with sample data (after)
      setSessions([...formattedSessions, ...sampleSessions]);
    } catch (error) {
      console.error('Error loading check-ins:', error);
    }
  };

  // Inactivity and auto-finalize helpers
  const clearInactivityTimer = () => {
    if (inactivityTimerRef.current) {
      window.clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  };

  const scheduleInactivityTimer = () => {
    clearInactivityTimer();
    inactivityTimerRef.current = window.setTimeout(() => {
      if (isConnected && !isFinalizing) {
        console.log('Inactivity timeout reached, auto-finalizing conversation.');
        endConversation();
      }
    }, 15000);
  };

  // Disabled auto-ending on closing phrases - user controls when to end
  const maybeEndOnClosingPhrase = (text: string) => {
    // Just log that Mira is wrapping up, but don't auto-end
    const closers = [/i'll check in again soon/i, /let you rest now/i, /glad we talked/i, /thank you for sharing/i, /talk again soon/i];
    if (closers.some(r => r.test(text))) {
      console.log('Mira used a closing phrase - conversation can be ended by user when ready.');
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
        clearInactivityTimer();
        setConversationTranscript(prev => [...prev, `User: ${userText}`]);
        transcriptRef.current += `User: ${userText}\n`;
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
        transcriptRef.current += `Mira: ${aiText}\n`;
        setCurrentText(aiText); // Keep showing the last thing Mira said
        maybeEndOnClosingPhrase(aiText);
        break;
        
      case 'response.audio.delta':
        // AI is generating audio
        setIsSpeaking(true);
        break;
        
      case 'response.audio.done':
        // AI finished generating audio
        setIsSpeaking(false);
        scheduleInactivityTimer();
        break;
        
      case 'response.done':
        // Let user manually end the conversation
        // (Mira will naturally conclude after covering all 7 areas)
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
      setIsFinalizing(false);
      clearInactivityTimer();
      transcriptRef.current = "";
      
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
    if (isFinalizing) return;
    setIsFinalizing(true);
    clearInactivityTimer();
    
    try {
      // Disconnect the chat first
      if (chatRef.current) {
        chatRef.current.disconnect();
      }
      setIsConnected(false);
      setIsSpeaking(false);
      
      // Compile full transcript from both user and AI
      let fullTranscript = transcriptRef.current || conversationTranscript.join('\n');
      
      if (!fullTranscript.trim()) {
        toast({
          title: "No conversation recorded",
          description: "Please try again - make sure to speak during the check-in",
          variant: "destructive",
        });
        transcriptRef.current = "";
        setConversationTranscript([]);
        setIsFinalizing(false);
        return;
      }
      
      console.log('Processing transcript:', fullTranscript);
      setTranscript(fullTranscript);

      // Show processing toast
      toast({
        title: "Processing your check-in...",
        description: "Analyzing your conversation",
      });

      // Analyze sentiment
      const { data: sentimentData, error: sentimentError } = await supabase.functions.invoke(
        'analyze-sentiment',
        { body: { text: fullTranscript } }
      );

      if (sentimentError) {
        console.error('Sentiment analysis error:', sentimentError);
        throw new Error(`Sentiment analysis failed: ${sentimentError.message || 'Unknown error'}`);
      }

      if (!sentimentData) {
        throw new Error('No sentiment data received');
      }
      
      console.log('Sentiment analysis complete:', sentimentData);
      setSentiment(sentimentData);

      // Get authenticated user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated. Please log in and try again.');
      }

      console.log('Saving check-in to database for user:', user.id);

      // Save to database with better error handling
      const { data: insertData, error: insertError } = await supabase
        .from('check_ins')
        .insert({
          user_id: user.id,
          transcript: fullTranscript,
          sentiment_score: sentimentData.sentiment_score,
          sentiment_label: sentimentData.sentiment_label,
          emotions: sentimentData.emotions || {},
          mood_rating: sentimentData.mood_rating,
          mental_health_score: sentimentData.mental_health_score,
          physical_health_score: sentimentData.physical_health_score,
          overall_score: sentimentData.overall_score,
          mental_indicators: sentimentData.mental_indicators || [],
          physical_indicators: sentimentData.physical_indicators || [],
        })
        .select();

      if (insertError) {
        console.error('Database insert error:', insertError);
        throw new Error(`Failed to save check-in: ${insertError.message}`);
      }

      console.log('Check-in saved successfully:', insertData);

      // Reload check-ins from database to ensure consistency
      await loadCheckIns();

      toast({
        title: "Check-in complete! ✓",
        description: "Your check-in has been saved successfully.",
      });
      
      transcriptRef.current = "";
      setConversationTranscript([]);
      setIsFinalizing(false);
      
    } catch (error) {
      console.error('Error processing conversation:', error);
      setIsFinalizing(false);
      
      toast({
        title: "Error saving check-in",
        description: error instanceof Error ? error.message : "Failed to process conversation. Please try again.",
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
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 p-4 md:p-8 space-y-8">
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
          Just talk to Mira — she understands you naturally.
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
                <p className="text-sm font-medium">Mira:</p>
                <p className="text-sm">{currentText}</p>
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
            {sessions.slice(0, 5).map((session) => (
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
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-2 cursor-help">
                              <img src={getOverallScoreIcon(session.sentiment.overall_score || 3)} alt="" className="w-6 h-6" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="flex items-center gap-2">
                              <img src={getOverallScoreIcon(session.sentiment.overall_score || 3)} alt="" className="w-5 h-5" />
                              <span className="text-xs">{getOverallScoreLabel(session.sentiment.overall_score || 3)}</span>
                            </div>
                          </TooltipContent>
                        </Tooltip>
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
                      
                      {/* Highlights and Concerns */}
                      {((session.sentiment.highlights && session.sentiment.highlights.length > 0) || 
                        (session.sentiment.concerns && session.sentiment.concerns.length > 0)) && (
                        <div className="flex flex-wrap gap-2">
                          {session.sentiment.highlights?.map((highlight, idx) => (
                            <span key={`h-${idx}`} className="px-3 py-1 rounded-full text-xs font-bold italic text-black">
                              {highlight}
                            </span>
                          ))}
                          {session.sentiment.concerns?.map((concern, idx) => (
                            <span key={`c-${idx}`} className="px-3 py-1 rounded-full text-xs font-bold italic text-red-700">
                              {concern}
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
    </TooltipProvider>
  );
};

export default CheckIn;
