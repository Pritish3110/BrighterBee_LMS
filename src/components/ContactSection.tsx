import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Phone, Mail, Facebook, Instagram, Youtube } from "lucide-react";
import emailjs from "@emailjs/browser";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

const EMAILJS_PUBLIC_KEY = "U4X1hdrXt4Qyks9V0";
const EMAILJS_SERVICE_ID = "service_unoq8un";
const EMAILJS_TEMPLATE_ID = "template_9xqoxhg";

const ContactSection = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    state: "",
    city: "",
    message: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleStateChange = (value: string) => {
    setFormData(prev => ({ ...prev, state: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.first_name || !formData.last_name || !formData.email || !formData.phone || !formData.state || !formData.city || !formData.message) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone: formData.phone,
          state: formData.state,
          city: formData.city,
          message: formData.message,
          to_email: "brighterbeeindia@gmail.com",
        },
        EMAILJS_PUBLIC_KEY
      );

      toast({
        title: "Message Sent!",
        description: "Thank you for your inquiry. We'll get back to you soon!",
      });

      setFormData({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        state: "",
        city: "",
        message: "",
      });
    } catch (error) {
      console.error("EmailJS Error:", error);
      toast({
        title: "Failed to Send",
        description: "Something went wrong. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="container mx-auto px-4 py-16">
      <h2 className="text-3xl font-bold text-center text-foreground mb-12">
        Get In Touch
      </h2>
      
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left Side - Contact Info */}
        <Card className="border-honey-200 hover:shadow-lg hover:shadow-honey-200/50 transition-all">
          <CardHeader>
            <CardTitle className="text-xl">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Address */}
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-honey-100 flex items-center justify-center flex-shrink-0">
                <MapPin className="h-6 w-6 text-honey-600" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Address</h3>
                <p className="text-muted-foreground leading-relaxed">
                  BRIGHTER BEE, 424, Opera Business Hub,<br />
                  Lajamni Chowk, Mota Varachha,<br />
                  Surat, Gujarat, India – 394101
                </p>
              </div>
            </div>

            {/* Phone */}
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-honey-100 flex items-center justify-center flex-shrink-0">
                <Phone className="h-6 w-6 text-honey-600" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Phone</h3>
                <a href="tel:7575066990" className="text-muted-foreground hover:text-honey-600 transition-colors">
                  7575066990
                </a>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-honey-100 flex items-center justify-center flex-shrink-0">
                <Mail className="h-6 w-6 text-honey-600" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Email</h3>
                <a href="mailto:brighterbeeindia@gmail.com" className="text-muted-foreground hover:text-honey-600 transition-colors">
                  brighterbeeindia@gmail.com
                </a>
              </div>
            </div>

            {/* Social Icons */}
            <div className="pt-4 border-t border-honey-200">
              <h3 className="font-semibold text-foreground mb-4">Follow Us</h3>
              <div className="flex gap-3">
                <a
                  href="#"
                  className="h-10 w-10 rounded-xl bg-honey-100 flex items-center justify-center hover:bg-honey-200 transition-colors"
                  aria-label="Facebook"
                >
                  <Facebook className="h-5 w-5 text-honey-600" />
                </a>
                <a
                  href="#"
                  className="h-10 w-10 rounded-xl bg-honey-100 flex items-center justify-center hover:bg-honey-200 transition-colors"
                  aria-label="Instagram"
                >
                  <Instagram className="h-5 w-5 text-honey-600" />
                </a>
                <a
                  href="#"
                  className="h-10 w-10 rounded-xl bg-honey-100 flex items-center justify-center hover:bg-honey-200 transition-colors"
                  aria-label="YouTube"
                >
                  <Youtube className="h-5 w-5 text-honey-600" />
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Side - Form */}
        <Card className="border-honey-200 hover:shadow-lg hover:shadow-honey-200/50 transition-all">
          <CardHeader>
            <CardTitle className="text-xl">Send Us an Inquiry</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    placeholder="Enter first name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    placeholder="Enter last name"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter email address"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="Enter phone number"
                  required
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Select value={formData.state} onValueChange={handleStateChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {INDIAN_STATES.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="Enter city"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Your Inquiry</Label>
                <Textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  placeholder="Write your inquiry or message here..."
                  rows={4}
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-honey-500 hover:bg-honey-600 text-honey-foreground font-semibold"
              >
                {isSubmitting ? "Sending..." : "Submit Inquiry"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default ContactSection;
