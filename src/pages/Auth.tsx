import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
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
  const { toast } = useToast();
  const navigate = useNavigate();
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

  // Avatar
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Family members
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([
    { name: "", relationship: "", email: "", phone: "" }
  ]);

  const startCamera = async () => {
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
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setCameraActive(false);
    }
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
          analyzeMedicationLabel(blob);
        }
      }, 'image/jpeg', 0.95);
      
      stopCamera();
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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
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

      // Save medications
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
    <div className="min-h-screen bg-background p-4 overflow-y-auto">
      <div className="max-w-4xl mx-auto py-8">
        <Card className="p-8 space-y-8">
          <div className="text-center space-y-4">
            <img src={logo} alt="Cheq-In" className="w-24 h-auto mx-auto" />
            <h1 className="text-3xl font-bold">Create Your Account</h1>
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
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              {/* Avatar Upload */}
              <div className="space-y-2">
                <Label>Profile Photo (Optional)</Label>
                <div className="flex items-center gap-4">
                  {avatarPreview && (
                    <img src={avatarPreview} alt="Avatar" className="w-20 h-20 rounded-full object-cover" />
                  )}
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="flex-1"
                  />
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
                  onClick={cameraActive ? capturePhoto : startCamera}
                  disabled={analyzingImage}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  {cameraActive ? 'Capture' : 'Take Photo'}
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

              {cameraActive && (
                <div className="relative">
                  <video ref={videoRef} autoPlay className="w-full rounded-lg" />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={stopCamera}
                  >
                    Cancel
                  </Button>
                </div>
              )}

              <canvas ref={canvasRef} className="hidden" />

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
              {loading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

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
    </div>
  );
};

export default Auth;
