import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { lovable } from "@/integrations/lovable/index";
import { Camera, Plus, X, Loader2, Trash2, Edit2, Check } from "lucide-react";
import logo from "@/assets/cheqin-logo.png";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface FamilyMember {
  name: string;
  relationship: string;
  email: string;
  phone: string;
}

interface Medication {
  id: string;
  name: string;
  dosage?: string;
  frequency?: string;
  timeOfDay: string[];
  instructions?: string;
}

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [cameraDialogOpen, setCameraDialogOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawNext = searchParams.get("next") ?? "";
  const nextPath =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/checkin";
  const [checkingSession, setCheckingSession] = useState(true);
  const setupMode = searchParams.get("setup") === "1";
  const [existingProfileId, setExistingProfileId] = useState<string | null>(null);

  // Google is the only sign-in method: once signed in, either finish the
  // one-time profile setup or continue into the app.
  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!active) return;
      if (!user) {
        setIsLogin(true);
        setCheckingSession(false);
        return;
      }

      setEmail(user.email ?? "");
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, physical_health_issues, mental_health_issues")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!active) return;

      if (profile && !setupMode) {
        navigate(nextPath, { replace: true });
        return;
      }

      if (profile) {
        // Editing existing setup: prefill everything we already have.
        setExistingProfileId(profile.id);
        setFullName(profile.full_name ?? "");
        setPhysicalIssues(profile.physical_health_issues ?? "");
        setMentalIssues(profile.mental_health_issues ?? "");

        const [{ data: meds }, { data: family }] = await Promise.all([
          supabase
            .from("medications")
            .select("id, name, dosage, frequency, time_of_day, instructions")
            .eq("user_id", user.id)
            .eq("active", true),
          supabase
            .from("family_members")
            .select("name, relationship, email, phone")
            .eq("senior_user_id", user.id),
        ]);
        if (!active) return;

        setMedications(
          (meds ?? []).map((m) => ({
            id: m.id,
            name: m.name,
            dosage: m.dosage ?? "",
            frequency: m.frequency ?? "",
            timeOfDay: m.time_of_day ?? [],
            instructions: m.instructions ?? "",
          })),
        );
        if (family && family.length > 0) {
          setFamilyMembers(
            family.map((f) => ({
              name: f.name ?? "",
              relationship: f.relationship ?? "",
              email: f.email ?? "",
              phone: f.phone ?? "",
            })),
          );
        }
      } else {
        setFullName(
          (user.user_metadata?.full_name as string) ??
            (user.user_metadata?.name as string) ??
            "",
        );
      }

      setIsLogin(false);
      setCheckingSession(false);
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cameraActive, setCameraActive] = useState(false);

  // Auth fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  // Medications
  const [medications, setMedications] = useState<Medication[]>([]);
  const [editingMedId, setEditingMedId] = useState<string | null>(null);
  const [medForm, setMedForm] = useState({
    name: '',
    dosage: '',
    frequency: '',
    timeOfDay: [] as string[],
    instructions: ''
  });

  // Health fields
  const [physicalIssues, setPhysicalIssues] = useState("");
  const [mentalIssues, setMentalIssues] = useState("");

  // Family members
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([
    { name: "", relationship: "", email: "", phone: "" }
  ]);

  const openCameraDialog = async () => {
    setCameraDialogOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (error) {
      toast({
        title: "Camera Error",
        description: "Could not access camera",
        variant: "destructive",
      });
      setCameraDialogOpen(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setCameraActive(false);
    }
    setCameraDialogOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);
      
      canvas.toBlob((blob) => {
        if (blob) {
          stopCamera();
          analyzeMedicationLabel(blob);
        }
      }, 'image/jpeg', 0.95);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      analyzeMedicationLabel(file);
    }
  };

  const analyzeMedicationLabel = async (imageFile: Blob) => {
    setAnalyzingImage(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(imageFile);
      
      reader.onloadend = async () => {
        const base64Image = reader.result as string;
        
        const { data, error } = await supabase.functions.invoke('analyze-medication-label', {
          body: { imageBase64: base64Image }
        });

        if (error) throw error;

        if (data.confidence === 'low' || data.error) {
          toast({
            title: "Could not read label",
            description: "Please enter medication details manually",
            variant: "destructive",
          });
          return;
        }

        // Add the recognized medication
        const newMed: Medication = {
          id: Date.now().toString(),
          name: data.name || '',
          dosage: data.dosage || '',
          frequency: data.frequency || '',
          timeOfDay: data.timeOfDay || [],
          instructions: data.instructions || ''
        };

        setMedications([...medications, newMed]);
        
        toast({
          title: "Medication Added",
          description: `${data.name} has been added`,
        });
      };
    } catch (error: any) {
      toast({
        title: "Analysis Failed",
        description: error.message || "Could not analyze image",
        variant: "destructive",
      });
    } finally {
      setAnalyzingImage(false);
    }
  };

  const addMedication = () => {
    if (!medForm.name.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter medication name",
        variant: "destructive",
      });
      return;
    }

    const newMed: Medication = {
      id: Date.now().toString(),
      ...medForm
    };

    setMedications([...medications, newMed]);
    setMedForm({ name: '', dosage: '', frequency: '', timeOfDay: [], instructions: '' });
    
    toast({
      title: "Medication Added",
      description: `${medForm.name} has been added`,
    });
  };

  const deleteMedication = (id: string) => {
    setMedications(medications.filter(m => m.id !== id));
  };

  const startEdit = (med: Medication) => {
    setEditingMedId(med.id);
    setMedForm({
      name: med.name,
      dosage: med.dosage || '',
      frequency: med.frequency || '',
      timeOfDay: med.timeOfDay,
      instructions: med.instructions || ''
    });
  };

  const saveEdit = () => {
    if (editingMedId) {
      setMedications(medications.map(m => 
        m.id === editingMedId ? { ...m, ...medForm } : m
      ));
      setEditingMedId(null);
      setMedForm({ name: '', dosage: '', frequency: '', timeOfDay: [], instructions: '' });
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

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      sessionStorage.setItem("post_auth_redirect", nextPath);
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });

      if (result.error) {
        toast({
          title: "Google sign-in failed",
          description: result.error.message ?? "Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (result.redirected) return;

      navigate(nextPath);
    } catch (error: any) {
      toast({
        title: "Google sign-in failed",
        description: error?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) throw new Error("Please sign in with Google first.");

      const userId = user.id;

      const isEditing = Boolean(existingProfileId);

      // Create or update profile
      const profileValues = {
        full_name: fullName,
        physical_health_issues: physicalIssues || null,
        mental_health_issues: mentalIssues || null,
      };

      const { error: profileError } = isEditing
        ? await supabase.from('profiles').update(profileValues).eq('user_id', userId)
        : await supabase.from('profiles').insert({ user_id: userId, ...profileValues });

      if (profileError) throw profileError;

      // Save medications (replace the existing set when editing)
      if (isEditing) {
        await supabase.from('medications').delete().eq('user_id', userId);
      }
      if (medications.length > 0) {
        const medData = medications.map(med => ({
          user_id: userId,
          name: med.name,
          dosage: med.dosage || null,
          frequency: med.frequency || null,
          time_of_day: med.timeOfDay.length > 0 ? med.timeOfDay : null,
          instructions: med.instructions || null,
          active: true,
        }));

        const { error: medError } = await supabase
          .from('medications')
          .insert(medData);

        if (medError) console.error('Medications error:', medError);
      }

      // Save family members
      const validFamilyMembers = familyMembers.filter(
        fm => fm.name.trim() && (fm.email.trim() || fm.phone.trim())
      );

      if (isEditing) {
        await supabase.from('family_members').delete().eq('senior_user_id', userId);
      }

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
        title: isEditing ? "Details updated" : "Welcome to Cheq-In!",
        description: isEditing
          ? "Your information has been saved."
          : "Your account has been created successfully.",
      });

      navigate(nextPath);
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

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isLogin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 space-y-6">
          <div className="text-center space-y-4">
            <img src={logo} alt="Cheq-In" className="w-24 h-auto mx-auto" />
            <h1 className="text-3xl font-bold">Welcome to Cheq-In</h1>
            <p className="text-muted-foreground">
              Sign in with your Google account to continue your wellness journey
            </p>
          </div>

          <Button
            type="button"
            size="lg"
            className="w-full"
            disabled={loading}
            onClick={handleGoogleSignIn}
          >
            <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9z"/>
              <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24z"/>
              <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.6V6.7H1.4a12 12 0 0 0 0 10.8l4-3.1z"/>
              <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.5 1.8l3.4-3.4C17.9 1.2 15.2 0 12 0A12 12 0 0 0 1.4 6.7l4 3.1C6.3 6.9 8.9 4.8 12 4.8z"/>
            </svg>
            {loading ? "Please wait..." : "Continue with Google"}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            New here? Signing in with Google creates your account.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 overflow-y-auto">
      <div className="max-w-4xl mx-auto py-8">
        <Card className="p-8 space-y-8">
          <div className="text-center space-y-4">
            <img src={logo} alt="Cheq-In" className="w-24 h-auto mx-auto" />
            <h1 className="text-3xl font-bold">Complete Your Profile</h1>
            <p className="text-muted-foreground">Tell us about yourself</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-8">
            {/* Basic Info */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Basic Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} disabled readOnly />
                </div>
              </div>
            </div>

            {/* Medications */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Medications</h2>
              <p className="text-sm text-muted-foreground">
                Take a photo of your medication label or enter manually
              </p>

              <div className="flex gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  onClick={openCameraDialog}
                  disabled={analyzingImage}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Take Photo
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={analyzingImage}
                >
                  Upload Photo
                </Button>

                {analyzingImage && (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Analyzing...</span>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />

              <canvas ref={canvasRef} className="hidden" />

              {/* Camera Dialog */}
              <Dialog open={cameraDialogOpen} onOpenChange={(open) => {
                if (!open) stopCamera();
              }}>
                <DialogContent className="sm:max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Take Photo of Medication Label</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    {cameraActive && (
                      <div className="relative">
                        <video ref={videoRef} autoPlay playsInline className="w-full rounded-lg" />
                      </div>
                    )}
                    <div className="flex gap-2 justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={stopCamera}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={capturePhoto}
                        disabled={!cameraActive}
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        Capture
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Manual Entry Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div className="space-y-2">
                  <Label>Medication Name</Label>
                  <Input
                    value={medForm.name}
                    onChange={(e) => setMedForm({ ...medForm, name: e.target.value })}
                    placeholder="e.g., Amlodipine"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Dosage</Label>
                  <Input
                    value={medForm.dosage}
                    onChange={(e) => setMedForm({ ...medForm, dosage: e.target.value })}
                    placeholder="e.g., 10mg"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Input
                    value={medForm.frequency}
                    onChange={(e) => setMedForm({ ...medForm, frequency: e.target.value })}
                    placeholder="e.g., Once daily"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Time of Day</Label>
                  <Input
                    value={medForm.timeOfDay.join(', ')}
                    onChange={(e) => setMedForm({ ...medForm, timeOfDay: e.target.value.split(',').map(t => t.trim()) })}
                    placeholder="e.g., Morning, Evening"
                  />
                </div>

                <div className="md:col-span-2">
                  <Button
                    type="button"
                    onClick={editingMedId ? saveEdit : addMedication}
                    className="w-full"
                  >
                    {editingMedId ? <><Check className="w-4 h-4 mr-2" /> Save</> : <><Plus className="w-4 h-4 mr-2" /> Add Medication</>}
                  </Button>
                </div>
              </div>

              {/* Medications Table */}
              {medications.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Dosage</TableHead>
                        <TableHead>Frequency</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead className="w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {medications.map((med) => (
                        <TableRow key={med.id}>
                          <TableCell className="font-medium">{med.name}</TableCell>
                          <TableCell>{med.dosage || '-'}</TableCell>
                          <TableCell>{med.frequency || '-'}</TableCell>
                          <TableCell>{med.timeOfDay.join(', ') || '-'}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => startEdit(med)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteMedication(med.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            {/* Health Information */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Health Information (Optional)</h2>
              
              <div className="space-y-2">
                <Label htmlFor="physical">Physical Health Issues</Label>
                <Textarea
                  id="physical"
                  value={physicalIssues}
                  onChange={(e) => setPhysicalIssues(e.target.value)}
                  placeholder="e.g., High blood pressure, arthritis"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mental">Mental Health & Emotional Wellbeing</Label>
                <Textarea
                  id="mental"
                  value={mentalIssues}
                  onChange={(e) => setMentalIssues(e.target.value)}
                  placeholder="e.g., Anxiety, memory concerns"
                  rows={3}
                />
              </div>
            </div>

            {/* Family Contacts */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Family Contacts (Optional)</h2>
              
              <div className="space-y-4">
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input
                        value={member.name}
                        onChange={(e) => updateFamilyMember(index, 'name', e.target.value)}
                        placeholder="Name"
                      />
                      <Input
                        value={member.relationship}
                        onChange={(e) => updateFamilyMember(index, 'relationship', e.target.value)}
                        placeholder="Relationship (e.g., Daughter)"
                      />
                      <Input
                        type="email"
                        value={member.email}
                        onChange={(e) => updateFamilyMember(index, 'email', e.target.value)}
                        placeholder="Email"
                      />
                      <Input
                        type="tel"
                        value={member.phone}
                        onChange={(e) => updateFamilyMember(index, 'phone', e.target.value)}
                        placeholder="Phone"
                      />
                    </div>
                  </Card>
                ))}
              </div>

              <Button type="button" onClick={addFamilyMember} variant="outline" className="w-full">
                <Plus className="w-4 h-4 mr-2" /> Add Family Member
              </Button>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Saving..." : "Finish Setup"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
