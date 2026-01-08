import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText } from "lucide-react";
import logo from "@/assets/cheqin-logo.png";

const teamMembers = [
  {
    name: "Vinan Adhikesavan",
    role: "Co-Founder & Developer",
    school: "Freshman, College Preparatory School",
    location: "Oakland, CA",
    image: "/placeholder.svg", // Replace with actual image
    bio: "Vinan is a passionate high school student with a deep interest in technology and its potential to improve lives. As a freshman at College Preparatory School, he brings fresh perspectives and innovative ideas to the team. His dedication to creating meaningful solutions for seniors stems from his close relationship with his grandparents and his desire to bridge the gap between technology and elderly care.",
    resumeLink: "#", // Add actual resume link
  },
  {
    name: "Srinivas KV",
    role: "Co-Founder & Developer",
    school: "Junior, Moreau Catholic High School",
    location: "Hayward, CA",
    image: "/placeholder.svg", // Replace with actual image
    bio: "Srinivas is a driven junior at Moreau Catholic High School with a strong foundation in computer science and a passion for building products that matter. His experience in software development combined with his empathy for elderly care challenges makes him an invaluable team member. He believes technology should be accessible to everyone, regardless of age.",
    resumeLink: "#", // Add actual resume link
  },
];

const Team = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img src={logo} alt="Cheq-In Logo" className="w-12 h-auto" />
            <span className="text-2xl font-bold">Cheq-In</span>
          </Link>
          <Link to="/">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-5xl md:text-6xl font-bold mb-6">Meet The Team</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Two passionate high school students on a mission to make wellness care more accessible and personal for seniors and their families.
        </p>
      </section>

      {/* Team Members */}
      <section className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {teamMembers.map((member) => (
            <Card key={member.name} className="overflow-hidden border-0 shadow-2xl">
              <div className="aspect-square overflow-hidden bg-muted">
                <img
                  src={member.image}
                  alt={member.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-8 space-y-6">
                <div>
                  <h2 className="text-3xl font-bold">{member.name}</h2>
                  <p className="text-lg text-accent font-medium mt-1">{member.role}</p>
                  <p className="text-muted-foreground mt-2">{member.school}</p>
                  <p className="text-muted-foreground">{member.location}</p>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold mb-3">About Me</h3>
                  <p className="text-muted-foreground leading-relaxed">{member.bio}</p>
                </div>

                <Button variant="outline" className="gap-2" asChild>
                  <a href={member.resumeLink} target="_blank" rel="noopener noreferrer">
                    <FileText className="w-4 h-4" />
                    View Resume
                  </a>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 mt-20 bg-muted/30">
        <div className="container mx-auto px-4 text-center space-y-4">
          <img src={logo} alt="Cheq-In" className="w-20 h-auto mx-auto opacity-80" />
          <p className="text-lg text-muted-foreground">© 2025 Cheq-In</p>
          <p className="text-base text-muted-foreground italic">
            Because love deserves a daily Cheq-In
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Team;
