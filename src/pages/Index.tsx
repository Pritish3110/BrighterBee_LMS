import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, GraduationCap, Users, Sparkles } from "lucide-react";
import brighterBeeLogo from "@/assets/brighter-bee-logo.jpg";
import ContactSection from "@/components/ContactSection";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-honey-50 via-background to-honey-100">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={brighterBeeLogo} alt="BrighterBee Logo" className="h-40 md:h-56 w-auto drop-shadow-[0_0_25px_rgba(251,191,36,0.4)] hover:drop-shadow-[0_0_35px_rgba(251,191,36,0.6)] transition-all duration-300" />
          </div>
          <Link to="/auth">
            <Button className="bg-honey-500 hover:bg-honey-600 text-honey-foreground font-semibold">
              Get Started
            </Button>
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-honey-100 text-honey-700 px-4 py-2 rounded-full mb-6">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">Learning Made Sweet</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            Welcome to <span className="text-honey-500">BrighterBee</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            A buzzing learning management system for nursery, junior KG, and senior KG students. 
            Making education as sweet as honey! 🍯
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth">
              <Button size="lg" className="bg-honey-500 hover:bg-honey-600 text-honey-foreground font-semibold w-full sm:w-auto">
                Start Learning
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="border-honey-300 hover:bg-honey-50">
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center text-foreground mb-12">
          Why Choose BrighterBee?
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="border-honey-200 hover:shadow-lg hover:shadow-honey-200/50 transition-all">
            <CardHeader>
              <div className="h-12 w-12 rounded-xl bg-honey-100 flex items-center justify-center mb-4">
                <BookOpen className="h-6 w-6 text-honey-600" />
              </div>
              <CardTitle>Interactive Courses</CardTitle>
              <CardDescription>
                Engaging lessons designed specifically for young learners
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Age-appropriate content for nursery through senior KG with colorful materials and fun activities.
              </p>
            </CardContent>
          </Card>

          <Card className="border-honey-200 hover:shadow-lg hover:shadow-honey-200/50 transition-all">
            <CardHeader>
              <div className="h-12 w-12 rounded-xl bg-honey-100 flex items-center justify-center mb-4">
                <GraduationCap className="h-6 w-6 text-honey-600" />
              </div>
              <CardTitle>Track Progress</CardTitle>
              <CardDescription>
                Monitor learning milestones and achievements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Visual progress tracking helps students and parents see learning achievements unfold.
              </p>
            </CardContent>
          </Card>

          <Card className="border-honey-200 hover:shadow-lg hover:shadow-honey-200/50 transition-all">
            <CardHeader>
              <div className="h-12 w-12 rounded-xl bg-honey-100 flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-honey-600" />
              </div>
              <CardTitle>For Everyone</CardTitle>
              <CardDescription>
                Dedicated dashboards for students, teachers, and admins
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Role-based access ensures everyone has the right tools for their needs.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="bg-gradient-to-r from-honey-400 to-honey-500 rounded-3xl p-8 md:p-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-honey-foreground mb-4">
            Ready to Start Buzzing?
          </h2>
          <p className="text-honey-foreground/90 text-lg mb-8 max-w-2xl mx-auto">
            Join our hive of happy learners today and watch your little ones bloom!
          </p>
          <Link to="/auth">
            <Button size="lg" className="bg-background text-foreground hover:bg-honey-50 font-semibold">
              Create Free Account
            </Button>
          </Link>
        </div>
      </section>

      {/* Contact Section */}
      <ContactSection />

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t border-honey-200">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={brighterBeeLogo} alt="BrighterBee Logo" className="h-12 w-auto" />
          </div>
          <p className="text-sm text-muted-foreground">
            © 2024 BrighterBee. Making learning sweet for little ones.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
