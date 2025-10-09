import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heart, MessageCircle, Pill, Users } from "lucide-react";
import logo from "@/assets/cheqin-logo.png";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center space-y-8">
          <img 
            src={logo} 
            alt="CheqIn Logo" 
            className="w-32 md:w-40 h-auto"
          />
          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-bold text-foreground">
              CheqIn
            </h1>
            <p className="text-2xl md:text-3xl text-muted-foreground">
              Because love deserves a daily CheqIn
            </p>
          </div>
          <p className="text-xl md:text-2xl max-w-2xl text-foreground">
            A friendly voice companion for brighter days
          </p>
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button size="lg" variant="accent" className="text-lg px-8 py-6">
              Start Check-In
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-6">
              Learn More
            </Button>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-4 text-foreground">
          Care That Understands
        </h2>
        <p className="text-xl text-center text-muted-foreground mb-16 max-w-2xl mx-auto">
          Advanced wellness monitoring that feels human
        </p>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Daily Check-In */}
          <Card className="p-8 space-y-6 border-2 hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="bg-accent/10 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto">
              <MessageCircle className="w-10 h-10 text-accent" strokeWidth={1.5} />
            </div>
            <div className="space-y-3">
              <h3 className="text-2xl font-bold text-center">Daily Check-In</h3>
              <p className="text-lg text-muted-foreground text-center">
                Natural voice conversations that track mood, sleep quality, and daily activities. 
                Our AI listens with empathy and asks thoughtful follow-up questions.
              </p>
            </div>
            <div className="pt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-accent rounded-full"></div>
                <span>Voice-first interaction</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-accent rounded-full"></div>
                <span>Mood & tone detection</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-accent rounded-full"></div>
                <span>Emergency awareness</span>
              </div>
            </div>
          </Card>

          {/* Medicine Reminder */}
          <Card className="p-8 space-y-6 border-2 hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="bg-accent/10 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto">
              <Pill className="w-10 h-10 text-accent" strokeWidth={1.5} />
            </div>
            <div className="space-y-3">
              <h3 className="text-2xl font-bold text-center">Smart Medicine Reminders</h3>
              <p className="text-lg text-muted-foreground text-center">
                Scan pill bottles with your camera for instant recognition. 
                Get gentle, conversational reminders about when and how to take each medication.
              </p>
            </div>
            <div className="pt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-accent rounded-full"></div>
                <span>Visual pill recognition</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-accent rounded-full"></div>
                <span>Personalized schedules</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-accent rounded-full"></div>
                <span>Adherence tracking</span>
              </div>
            </div>
          </Card>

          {/* Sentiment & Family Connection */}
          <Card className="p-8 space-y-6 border-2 hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="bg-accent/10 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto">
              <Heart className="w-10 h-10 text-accent" strokeWidth={1.5} />
            </div>
            <div className="space-y-3">
              <h3 className="text-2xl font-bold text-center">Family Connection</h3>
              <p className="text-lg text-muted-foreground text-center">
                AI-powered sentiment analysis tracks emotional wellbeing over time. 
                Families receive beautiful trend reports and instant alerts for concerning changes.
              </p>
            </div>
            <div className="pt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-accent rounded-full"></div>
                <span>Emotion trend charts</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-accent rounded-full"></div>
                <span>Weekly wellness summaries</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-accent rounded-full"></div>
                <span>Automatic family updates</span>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <Card className="p-12 text-center space-y-6 bg-accent text-accent-foreground border-0">
          <h2 className="text-4xl md:text-5xl font-bold">
            Ready to start your daily CheqIn?
          </h2>
          <p className="text-xl md:text-2xl max-w-2xl mx-auto">
            Join thousands who make wellness a daily habit
          </p>
          <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-accent-foreground hover:bg-accent-foreground hover:text-accent">
            Get Started Today
          </Button>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p className="text-lg text-muted-foreground">
            © 2025 CheqIn. A wellness companion for brighter days.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
