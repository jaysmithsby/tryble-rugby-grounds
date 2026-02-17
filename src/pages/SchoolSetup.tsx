import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Loader2, CheckCircle, AlertCircle, Clock, Lock, Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { saProvinces } from "@/data/saProvinces";
import trybalLogo from "@/assets/trybal-logo.png";

type SetupState = "loading" | "invalid" | "expired" | "already_submitted" | "locked" | "otp" | "form" | "submitting" | "success" | "error";

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/school-onboarding`;

async function callAction(action: string, body: Record<string, unknown>) {
  const res = await fetch(`${FUNCTION_URL}?action=${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    body: JSON.stringify(body),
  });
  return res.json();
}

const SchoolSetup = () => {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();

  const [state, setState] = useState<SetupState>("loading");
  const [schoolName, setSchoolName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // OTP
  const [otp, setOtp] = useState("");
  const [otpSending, setOtpSending] = useState(false);

  // Form fields
  const [form, setForm] = useState({
    full_official_name: "",
    nickname: "",
    province: "",
    year_established: "",
    school_motto: "",
    main_rival: "",
    number_of_springboks: "0",
    school_trivia: "",
    primary_colour: "",
    secondary_colour: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
  });
  const [crestUrl, setCrestUrl] = useState("");
  const [crestUploading, setCrestUploading] = useState(false);
  const [crestPreview, setCrestPreview] = useState("");

  // Validate token on mount
  useEffect(() => {
    if (!token) { setState("invalid"); return; }
    (async () => {
      const data = await callAction("validate-token", { token });
      switch (data.status) {
        case "valid":
          setSchoolName(data.school_name);
          setContactEmail(data.contact_email);
          if (data.otp_verified) {
            setForm(f => ({ ...f, full_official_name: data.school_name, contact_email: data.contact_email }));
            setState("form");
          } else {
            setState("otp");
          }
          break;
        case "expired": setState("expired"); break;
        case "already_submitted":
          setSchoolName(data.school_name);
          setState("already_submitted");
          break;
        case "locked": setState("locked"); break;
        default: setState("invalid");
      }
    })();
  }, [token]);

  // Send OTP
  const sendOtp = useCallback(async () => {
    setOtpSending(true);
    const data = await callAction("send-otp", { token });
    setOtpSending(false);
    if (data.error) {
      toast({ title: "Error", description: data.error, variant: "destructive" });
    } else {
      toast({ title: "Code sent", description: `Verification code sent to ${contactEmail}` });
    }
  }, [token, contactEmail, toast]);

  // Auto-send OTP when entering OTP state
  useEffect(() => {
    if (state === "otp") sendOtp();
  }, [state]);

  // Verify OTP
  const verifyOtp = async () => {
    const data = await callAction("verify-otp", { token, otp });
    if (data.error) {
      toast({ title: "Verification failed", description: data.error, variant: "destructive" });
      setOtp("");
      if (data.error.includes("Too many")) setState("locked");
    } else {
      setForm(f => ({ ...f, full_official_name: schoolName, contact_email: contactEmail }));
      setState("form");
    }
  };

  // Upload crest
  const handleCrestUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 2MB", variant: "destructive" });
      return;
    }
    setCrestUploading(true);
    setCrestPreview(URL.createObjectURL(file));
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch(`${FUNCTION_URL}?action=upload-crest&token=${token}`, {
        method: "POST",
        headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        body: fd,
      });
      const data = await res.json();
      if (data.url) {
        setCrestUrl(data.url);
      } else {
        toast({ title: "Upload failed", description: data.error || "Please try again", variant: "destructive" });
        setCrestPreview("");
      }
    } catch {
      toast({ title: "Upload failed", description: "Please try again", variant: "destructive" });
      setCrestPreview("");
    }
    setCrestUploading(false);
  };

  // Form validation
  const isFormValid = () => {
    const f = form;
    return (
      f.full_official_name.trim() &&
      f.nickname.trim() &&
      f.province &&
      f.year_established &&
      Number(f.year_established) >= 1850 &&
      Number(f.year_established) <= new Date().getFullYear() &&
      f.contact_name.trim() &&
      f.contact_email.trim() &&
      /^0\d{9}$/.test(f.contact_phone.trim())
    );
  };

  // Submit form
  const handleSubmit = async () => {
    setState("submitting");
    const data = await callAction("submit-form", {
      token,
      ...form,
      year_established: Number(form.year_established),
      number_of_springboks: Number(form.number_of_springboks) || 0,
      crest_image_url: crestUrl || null,
    });
    if (data.error) {
      toast({ title: "Submission failed", description: data.error, variant: "destructive" });
      setState("form");
    } else {
      setState("success");
    }
  };

  const updateField = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  // ── Render states ──────────────────────────────────────────
  if (state === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
            <p className="text-muted-foreground">Validating your link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === "invalid") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">Invalid Link</h2>
            <p className="text-muted-foreground">This link is invalid. Please contact Trybal for a new invitation.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === "expired") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Link Expired</h2>
            <p className="text-muted-foreground">This invitation link has expired. Please contact Trybal for a new one.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === "already_submitted") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-primary" />
            <h2 className="text-xl font-semibold mb-2">Already Submitted</h2>
            <p className="text-muted-foreground">{schoolName}'s profile has already been submitted. Thank you!</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === "locked") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <Lock className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">Too Many Attempts</h2>
            <p className="text-muted-foreground">This invitation has been locked due to too many failed verification attempts. Please contact Trybal.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === "otp") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <img src={trybalLogo} alt="Trybal" className="h-10 mx-auto mb-4" />
            <CardTitle>Verify your identity</CardTitle>
            <CardDescription>
              We've sent a 6-digit code to <strong>{contactEmail}</strong>. Please enter it below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button onClick={verifyOtp} disabled={otp.length !== 6} className="w-full">
              Verify
            </Button>
            <Button variant="ghost" onClick={sendOtp} disabled={otpSending} className="w-full text-sm">
              {otpSending ? "Sending..." : "Resend code"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === "success") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center pb-2">
            <img src={trybalLogo} alt="Trybal" className="h-10 mx-auto mb-4" />
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <span className="text-3xl">🏉</span>
            </div>
            <CardTitle className="text-2xl">Thank you!</CardTitle>
            <CardDescription className="text-base mt-2">
              {schoolName}'s profile is now under review. We'll be in touch once it's live on Trybal.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link to="/">
              <Button variant="outline">Visit Trybal</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Form state ──────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <img src={trybalLogo} alt="Trybal" className="h-10 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground">Set up {schoolName}'s profile on Trybal</h1>
          <p className="text-muted-foreground mt-1">Fill in the details below and we'll get your school live.</p>
        </div>

        {/* Section 1: School Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">School Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="full_official_name">Full Official Name *</Label>
                <Input id="full_official_name" value={form.full_official_name} onChange={e => updateField("full_official_name", e.target.value)} placeholder="e.g. Afrikaanse Hoër Seunskool" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nickname">School Nickname *</Label>
                <Input id="nickname" value={form.nickname} onChange={e => updateField("nickname", e.target.value)} placeholder="e.g. Affies" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="province">Province *</Label>
                <Select value={form.province} onValueChange={v => updateField("province", v)}>
                  <SelectTrigger><SelectValue placeholder="Select province" /></SelectTrigger>
                  <SelectContent>
                    {saProvinces.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="year_established">Year Established *</Label>
                <Input id="year_established" type="number" min={1850} max={new Date().getFullYear()} value={form.year_established} onChange={e => updateField("year_established", e.target.value)} placeholder="e.g. 1920" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="school_motto">School Motto</Label>
                <Input id="school_motto" value={form.school_motto} onChange={e => updateField("school_motto", e.target.value)} placeholder="e.g. Laat Daar Lig Wees" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="main_rival">Main Rugby Rival (Derby)</Label>
                <Input id="main_rival" value={form.main_rival} onChange={e => updateField("main_rival", e.target.value)} placeholder="e.g. Pretoria Boys' High" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="number_of_springboks">Number of Springboks</Label>
                <Input id="number_of_springboks" type="number" min={0} value={form.number_of_springboks} onChange={e => updateField("number_of_springboks", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="primary_colour">Primary School Colour</Label>
                <Input id="primary_colour" value={form.primary_colour} onChange={e => updateField("primary_colour", e.target.value)} placeholder="e.g. Royal Blue" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="secondary_colour">Secondary School Colour</Label>
                <Input id="secondary_colour" value={form.secondary_colour} onChange={e => updateField("secondary_colour", e.target.value)} placeholder="e.g. Gold" />
              </div>
              <div className="space-y-2">
                <Label>School Crest/Badge</Label>
                {crestPreview ? (
                  <div className="relative w-20 h-20">
                    <img src={crestPreview} alt="Crest" className="w-20 h-20 object-contain rounded border" />
                    <button onClick={() => { setCrestPreview(""); setCrestUrl(""); }} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 cursor-pointer border rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent transition-colors">
                    {crestUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {crestUploading ? "Uploading..." : "Upload image (PNG, JPG, SVG — max 2MB)"}
                    <input type="file" accept="image/png,image/jpeg,image/svg+xml" className="hidden" onChange={handleCrestUpload} disabled={crestUploading} />
                  </label>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="school_trivia">School Trivia</Label>
              <Textarea id="school_trivia" value={form.school_trivia} onChange={e => updateField("school_trivia", e.target.value)} placeholder="Share a legendary moment from your school's rugby history..." maxLength={500} rows={3} />
              <p className="text-xs text-muted-foreground text-right">{form.school_trivia.length}/500</p>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Point of Contact</CardTitle>
            <CardDescription>Contact details are private and will not appear in the app.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contact_name">Full Name *</Label>
              <Input id="contact_name" value={form.contact_name} onChange={e => updateField("contact_name", e.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contact_email">Email Address *</Label>
                <Input id="contact_email" type="email" value={form.contact_email} onChange={e => updateField("contact_email", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_phone">Phone Number *</Label>
                <Input id="contact_phone" type="tel" value={form.contact_phone} onChange={e => updateField("contact_phone", e.target.value)} placeholder="e.g. 0821234567" />
                {form.contact_phone && !/^0\d{9}$/.test(form.contact_phone) && (
                  <p className="text-xs text-destructive">Must be 10 digits starting with 0</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSubmit} disabled={!isFormValid() || state === "submitting"} className="w-full h-12 text-lg" size="lg">
          {state === "submitting" ? (
            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Submitting...</>
          ) : (
            "Submit School Profile"
          )}
        </Button>
      </div>
    </div>
  );
};

export default SchoolSetup;
