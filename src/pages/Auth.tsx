import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Camera, ChevronRight, ChevronLeft, Plus, X } from "lucide-react";
import logo from "@/assets/cheqin-logo.png";

type SignupStep = 'auth' | 'medications' | 'health' | 'photo' | 'family';

interface FamilyMember {
  name: string;
  relationship: string;
  email: string;
  phone: string;
}

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [currentStep, setCurrentStep] = useState<SignupStep>('auth');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Auth step
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  // Medications step
  const [medications, setMedications] = useState("");

  // Health step
  const [physicalIssues, setPhysicalIssues] = useState("");
  const [mentalIssues, setMentalIssues] = useState("");

  // Photo step
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Family step
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([
    { name: "", relationship: "", email: "", phone: "" }
  ]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addFamilyMember = () => {
    setFamilyMembers([...familyMembers, { name: "", relationship: "", email: "", phone: "" }]);
  };

  const removeFamilyMember = (index: number) => {
    setFamilyMembers(familyMembers.filter((_, i) => i !== index));
  };

  const updateFamilyMember = (index: number, field: keyof FamilyMember, value: string) => {
    const updated = [...familyMembers];
    updated[index][field] = value;
    setFamilyMembers(updated);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      
      toast({
        title: "Welcome back!",
        description: "You've successfully signed in.",
      });
      navigate("/checkin");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignupComplete = async () => {
    setLoading(true);

    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create user");

      const userId = authData.user.id;

      // Upload avatar if provided
      let avatarUrl = null;
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${userId}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile);

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);
          avatarUrl = urlData.publicUrl;
        }
      }

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: userId,
          full_name: fullName,
          avatar_url: avatarUrl,
          physical_health_issues: physicalIssues || null,
          mental_health_issues: mentalIssues || null,
        });

      if (profileError) throw profileError;

      // Save medications if provided
      if (medications.trim()) {
        const medList = medications.split('\n').filter(m => m.trim());
        for (const med of medList) {
          await supabase.from('medications').insert({
            user_id: userId,
            name: med.trim(),
            active: true,
          });
        }
      }

      // Save family members
      const validFamilyMembers = familyMembers.filter(
        fm => fm.name.trim() && (fm.email.trim() || fm.phone.trim())
      );

      if (validFamilyMembers.length > 0) {
        const familyData = validFamilyMembers.map(fm => ({
          senior_user_id: userId,
          name: fm.name,
          relationship: fm.relationship || 'Family',
          email: fm.email || null,
          phone: fm.phone || null,
        }));

        const { error: familyError } = await supabase
          .from('family_members')
          .insert(familyData);

        if (familyError) console.error('Family members error:', familyError);
      }

      toast({
        title: "Welcome to Cheq-In!",
        description: "Your account has been created successfully.",
      });

      navigate("/checkin");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    const steps: SignupStep[] = ['auth', 'medications', 'health', 'photo', 'family'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    const steps: SignupStep[] = ['auth', 'medications', 'health', 'photo', 'family'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'auth': return 'Create Your Account';
      case 'medications': return 'Your Medications';
      case 'health': return 'Health Information';
      case 'photo': return 'Add Your Photo';
      case 'family': return 'Family Contacts';
      default: return '';
    }
  };

  const getStepNumber = () => {
    const steps: SignupStep[] = ['auth', 'medications', 'health', 'photo', 'family'];
    return steps.indexOf(currentStep) + 1;
  };

  if (isLogin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 space-y-6">
          <div className="text-center space-y-4">
            <img src={logo} alt="Cheq-In" className="w-24 h-auto mx-auto" />
            <h1 className="text-3xl font-bold">Welcome Back</h1>
            <p className="text-muted-foreground">Sign in to continue your wellness journey</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Please wait..." : "Sign In"}
            </Button>
          </form>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Don't have an account? Sign up
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full p-8 space-y-6">
        <div className="text-center space-y-4">
          <img src={logo} alt="Cheq-In" className="w-24 h-auto mx-auto" />
          <h1 className="text-3xl font-bold">{getStepTitle()}</h1>
          <p className="text-muted-foreground">Step {getStepNumber()} of 5</p>
        </div>

        {/* Auth Step */}
        {currentStep === 'auth' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                minLength={6}
              />
            </div>

            <Button onClick={nextStep} className="w-full" disabled={!fullName || !email || !password}>
              Continue <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Medications Step */}
        {currentStep === 'medications' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="medications">What medications do you take?</Label>
              <p className="text-sm text-muted-foreground">Enter each medication on a new line. You can skip this for now.</p>
              <Textarea
                id="medications"
                value={medications}
                onChange={(e) => setMedications(e.target.value)}
                placeholder="e.g.&#10;Thyroid medication - Morning&#10;Amlodipine - Morning&#10;Multivitamin - Evening"
                rows={6}
              />
            </div>

            <div className="flex gap-3">
              <Button onClick={prevStep} variant="outline" className="flex-1">
                <ChevronLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button onClick={nextStep} className="flex-1">
                Continue <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Health Step */}
        {currentStep === 'health' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="physical">Physical Health Issues</Label>
              <p className="text-sm text-muted-foreground">Any ongoing physical health conditions? (Optional)</p>
              <Textarea
                id="physical"
                value={physicalIssues}
                onChange={(e) => setPhysicalIssues(e.target.value)}
                placeholder="e.g., High blood pressure, arthritis, diabetes"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mental">Mental Health & Emotional Wellbeing</Label>
              <p className="text-sm text-muted-foreground">Any mental health considerations? (Optional)</p>
              <Textarea
                id="mental"
                value={mentalIssues}
                onChange={(e) => setMentalIssues(e.target.value)}
                placeholder="e.g., Anxiety, depression, memory concerns"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <Button onClick={prevStep} variant="outline" className="flex-1">
                <ChevronLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button onClick={nextStep} className="flex-1">
                Continue <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Photo Step */}
        {currentStep === 'photo' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Add Your Photo (Optional)</Label>
              <p className="text-sm text-muted-foreground">This helps personalize your experience</p>
              
              <div className="flex flex-col items-center gap-4 p-6 border-2 border-dashed rounded-lg">
                {avatarPreview ? (
                  <div className="relative">
                    <img src={avatarPreview} alt="Preview" className="w-32 h-32 rounded-full object-cover" />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2"
                      onClick={() => {
                        setAvatarFile(null);
                        setAvatarPreview(null);
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center">
                    <Camera className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}

                <Input
                  id="avatar"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Label htmlFor="avatar" className="cursor-pointer">
                  <Button type="button" variant="outline" asChild>
                    <span>{avatarPreview ? 'Change Photo' : 'Upload Photo'}</span>
                  </Button>
                </Label>
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={prevStep} variant="outline" className="flex-1">
                <ChevronLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button onClick={nextStep} className="flex-1">
                {avatarFile ? 'Continue' : 'Skip for Now'} <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Family Step */}
        {currentStep === 'family' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Family Member Contacts (Optional)</Label>
              <p className="text-sm text-muted-foreground">Add contacts for children, siblings, or other family members</p>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {familyMembers.map((member, index) => (
                <Card key={index} className="p-4 space-y-3 relative">
                  {familyMembers.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => removeFamilyMember(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}

                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={member.name}
                      onChange={(e) => updateFamilyMember(index, 'name', e.target.value)}
                      placeholder="Family member's name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Relationship</Label>
                    <Input
                      value={member.relationship}
                      onChange={(e) => updateFamilyMember(index, 'relationship', e.target.value)}
                      placeholder="e.g., Daughter, Son, Sibling"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={member.email}
                        onChange={(e) => updateFamilyMember(index, 'email', e.target.value)}
                        placeholder="email@example.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input
                        type="tel"
                        value={member.phone}
                        onChange={(e) => updateFamilyMember(index, 'phone', e.target.value)}
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <Button type="button" onClick={addFamilyMember} variant="outline" className="w-full">
              <Plus className="w-4 h-4 mr-2" /> Add Another Family Member
            </Button>

            <div className="flex gap-3">
              <Button onClick={prevStep} variant="outline" className="flex-1">
                <ChevronLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button onClick={handleSignupComplete} className="flex-1" disabled={loading}>
                {loading ? "Creating Account..." : "Complete Sign Up"}
              </Button>
            </div>
          </div>
        )}

        <div className="text-center">
          <button
            type="button"
            onClick={() => setIsLogin(true)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Already have an account? Sign in
          </button>
        </div>
      </Card>
    </div>
  );
};

export default Auth;
