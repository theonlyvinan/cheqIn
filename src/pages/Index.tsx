import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heart, MessageCircle, Pill, TrendingUp } from "lucide-react";
import logo from "@/assets/cheqin-logo.png";
import dailyCheckin from "@/assets/daily-checkin.png";
import medicineReminder from "@/assets/medicine-reminder.png";
import emotionalWellbeing from "@/assets/emotional-wellbeing.png";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background page-container">
      {/* Hero Section */}
      <header className="relative container mx-auto px-4 py-12 overflow-hidden">
        <div className="absolute inset-0 rounded-3xl -z-10" style={{ background: 'var(--shine-gradient)' }}></div>
        <div className="flex flex-col items-center justify-center min-h-[85vh] text-center space-y-10">
          {/* Logo + Text Combined with 3D Effect */}
          <div className="animate-fade-in flex items-end gap-0 group perspective-1000">
            <img 
              src={logo} 
              alt="Cheq-In Logo" 
              id="hero-logo"
              className="w-52 md:w-64 h-auto transition-all duration-500 cursor-pointer animate-pulse -mr-10"
              style={{ 
                filter: 'drop-shadow(0 10px 30px hsl(190 85% 45% / 0.3))',
                transform: 'rotateY(0deg) rotateX(0deg)',
                transformStyle: 'preserve-3d',
                transition: 'transform 0.5s ease-out'
              }}
            />
            <div className="relative">
              <h1 
                className="text-6xl md:text-8xl font-bold bg-gradient-to-r from-foreground via-foreground to-accent bg-clip-text text-transparent cursor-pointer"
                onMouseEnter={() => {
                  const logo = document.getElementById('hero-logo');
                  if (logo) {
                    logo.style.animation = 'pulse 1s ease-in-out infinite';
                  }
                }}
                onMouseLeave={() => {
                  const logo = document.getElementById('hero-logo');
                  if (logo) {
                    logo.style.animation = 'none';
                  }
                }}
              >
                Cheq-In
              </h1>
            </div>
          </div>
          
          <style dangerouslySetInnerHTML={{ __html: `
            .perspective-1000 {
              perspective: 1000px;
            }
            #hero-logo {
              transform-style: preserve-3d;
            }
            #hero-logo:hover {
              transform: rotateY(15deg) rotateX(5deg) scale(1.1);
              filter: drop-shadow(0 20px 40px hsl(190 85% 45% / 0.5));
            }
          `}} />
          
          <div className="space-y-6 max-w-4xl">
            <p className="text-2xl md:text-3xl font-medium text-foreground italic">
              Because love deserves a daily Cheq-In
            </p>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              A wellness companion for brighter days
            </p>
            <p className="text-lg md:text-xl text-muted-foreground/80 max-w-2xl mx-auto leading-relaxed">
              A caring voice for seniors — one that talks, listens, and remembers. A gentle presence for families who can stay connected, comforted, and close, no matter the distance
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-6 pt-6">
            <Button 
              size="lg" 
              variant="hero" 
              className="text-xl px-12 py-7 rounded-full"
              onClick={() => navigate("/auth")}
            >
              <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                Start Your Check-In
              </span>
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-xl px-12 py-7 rounded-full hover:scale-105 transition-transform"
              onClick={() => {
                document.querySelector('#features')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Learn More
            </Button>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-24">
        <div className="text-center mb-20 space-y-4">
          <h2 className="text-5xl md:text-6xl font-bold text-foreground">
            Care That Understands
          </h2>
          <p className="text-2xl text-muted-foreground max-w-3xl mx-auto">
            Advanced AI wellness monitoring that feels warm, personal, and deeply human
          </p>
        </div>
        
        <div className="grid lg:grid-cols-3 gap-12 max-w-7xl mx-auto">
          {/* Daily Check-In */}
          <Card className="group overflow-hidden border-0 shadow-2xl transition-all duration-500 hover:scale-[1.02]" style={{ boxShadow: '0 20px 50px -10px hsl(190 85% 45% / 0.2), var(--glow-primary)' }}>
            <div className="aspect-[4/3] overflow-hidden">
              <img 
                src={dailyCheckin} 
                alt="Daily Check-In" 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            </div>
            <div className="p-8 space-y-6">
              <div className="bg-accent/10 w-16 h-16 rounded-2xl flex items-center justify-center">
                <MessageCircle className="w-8 h-8 text-accent" strokeWidth={1.5} />
              </div>
              <div className="space-y-4">
                <h3 className="text-3xl font-bold">Daily Check-In</h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Natural voice conversations that track mood, sleep quality, and daily activities. 
                  Our AI listens with empathy and asks thoughtful follow-up questions.
                </p>
              </div>
              <div className="pt-4 space-y-3">
                <div className="flex items-center gap-3 text-base">
                  <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
                  <span>Voice-first interaction</span>
                </div>
                <div className="flex items-center gap-3 text-base">
                  <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
                  <span>Mood & tone detection</span>
                </div>
                <div className="flex items-center gap-3 text-base">
                  <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
                  <span>Emergency awareness</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Medicine Reminder */}
          <Card className="group overflow-hidden border-0 shadow-2xl transition-all duration-500 hover:scale-[1.02]" style={{ boxShadow: '0 20px 50px -10px hsl(25 95% 60% / 0.2), var(--glow-accent)' }}>
            <div className="aspect-[4/3] overflow-hidden">
              <img 
                src={medicineReminder} 
                alt="Smart Medicine Reminders" 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            </div>
            <div className="p-8 space-y-6">
              <div className="bg-accent/10 w-16 h-16 rounded-2xl flex items-center justify-center">
                <Pill className="w-8 h-8 text-accent" strokeWidth={1.5} />
              </div>
              <div className="space-y-4">
                <h3 className="text-3xl font-bold">Smart Medicine Reminders</h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Scan pill bottles with your camera for instant recognition. 
                  Get gentle, conversational reminders about when and how to take each medication.
                </p>
              </div>
              <div className="pt-4 space-y-3">
                <div className="flex items-center gap-3 text-base">
                  <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
                  <span>Visual pill recognition</span>
                </div>
                <div className="flex items-center gap-3 text-base">
                  <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
                  <span>Personalized schedules</span>
                </div>
                <div className="flex items-center gap-3 text-base">
                  <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
                  <span>Adherence tracking</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Emotional Wellbeing Trends */}
          <Card className="group overflow-hidden border-0 shadow-2xl transition-all duration-500 hover:scale-[1.02]" style={{ boxShadow: '0 20px 50px -10px hsl(280 65% 60% / 0.2), var(--glow-secondary)' }}>
            <div className="aspect-[4/3] overflow-hidden">
              <img 
                src={emotionalWellbeing} 
                alt="Emotional Wellbeing Trends" 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            </div>
            <div className="p-8 space-y-6">
              <div className="bg-accent/10 w-16 h-16 rounded-2xl flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-accent" strokeWidth={1.5} />
              </div>
              <div className="space-y-4">
                <h3 className="text-3xl font-bold">Emotional Wellbeing Trends</h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  AI-powered sentiment analysis tracks emotional wellbeing over time. 
                  Families receive beautiful trend reports and instant alerts for concerning changes.
                </p>
              </div>
              <div className="pt-4 space-y-3">
                <div className="flex items-center gap-3 text-base">
                  <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
                  <span>Emotion trend charts</span>
                </div>
                <div className="flex items-center gap-3 text-base">
                  <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
                  <span>Weekly wellness summaries</span>
                </div>
                <div className="flex items-center gap-3 text-base">
                  <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
                  <span>Automatic family updates</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <Card className="relative overflow-hidden p-16 text-center space-y-8 bg-gradient-to-br from-accent via-accent to-accent/80 text-accent-foreground border-0 shadow-2xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.1),transparent)]"></div>
          <div className="relative z-10 space-y-8">
            <h2 className="text-5xl md:text-6xl font-bold">
              Ready for your daily Cheq-In?
            </h2>
            <p className="text-2xl md:text-3xl max-w-3xl mx-auto opacity-90 italic">
              Because love deserves a daily Cheq-In
            </p>
            <p className="text-xl md:text-2xl max-w-3xl mx-auto opacity-80">
              Join families making wellness a warm, daily conversation
            </p>
            <Button 
              size="lg" 
              variant="hero" 
              className="text-xl px-12 py-7 rounded-full"
              onClick={() => navigate("/auth")}
            >
              <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                Get Started Today
              </span>
            </Button>
          </div>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 mt-20 bg-muted/30">
        <div className="container mx-auto px-4 text-center space-y-4">
          <img 
            src={logo} 
            alt="Cheq-In" 
            className="w-20 h-auto mx-auto opacity-80"
          />
          <p className="text-lg text-muted-foreground">
            © 2025 Cheq-In
          </p>
          <p className="text-base text-muted-foreground italic">
            Because love deserves a daily Cheq-In
          </p>
          <p className="text-sm text-muted-foreground/60">
            A wellness companion for brighter days
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
