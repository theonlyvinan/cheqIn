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
            className="w-32 h-32 md:w-40 md:h-40"
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
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-12 text-foreground">
          Simple. Caring. Always There.
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-8 text-center space-y-4 border-2">
            <div className="flex justify-center">
              <MessageCircle className="w-16 h-16" strokeWidth={1.5} />
            </div>
            <h3 className="text-2xl font-semibold">Daily Voice Log</h3>
            <p className="text-lg text-muted-foreground">
              Simply speak about your day. No screens, no typing.
            </p>
          </Card>

          <Card className="p-8 text-center space-y-4 border-2">
            <div className="flex justify-center">
              <Heart className="w-16 h-16" strokeWidth={1.5} />
            </div>
            <h3 className="text-2xl font-semibold">Friendly Chat</h3>
            <p className="text-lg text-muted-foreground">
              Natural conversations that feel like talking to a friend.
            </p>
          </Card>

          <Card className="p-8 text-center space-y-4 border-2">
            <div className="flex justify-center">
              <Pill className="w-16 h-16" strokeWidth={1.5} />
            </div>
            <h3 className="text-2xl font-semibold">Medicine Helper</h3>
            <p className="text-lg text-muted-foreground">
              Gentle reminders and guidance for your medications.
            </p>
          </Card>

          <Card className="p-8 text-center space-y-4 border-2">
            <div className="flex justify-center">
              <Users className="w-16 h-16" strokeWidth={1.5} />
            </div>
            <h3 className="text-2xl font-semibold">Family Updates</h3>
            <p className="text-lg text-muted-foreground">
              Keep loved ones informed with daily wellness summaries.
            </p>
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
