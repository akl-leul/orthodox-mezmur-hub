import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Music, FileText, Bell, Play } from "lucide-react";

const Home = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section
        className="relative min-h-screen flex flex-row justify-center items-center text-primary-foreground py-20 px-4 overflow-hidden"
        style={{
          backgroundImage: `
            linear-gradient(to top, rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0)),
            url('/image.jpg')
          `,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="container mx-auto text-center relative z-10">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 drop-shadow-md">
            Orthodox Mezmur Hub
          </h1>
          <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto opacity-90 drop-shadow-sm">
            Experience the beauty of Ethiopian Orthodox spiritual music. Listen
            to Mezmurs, read lyrics, and connect with a community of believers.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/mezmurs">
              <Button variant="hero" size="lg" className="gap-2">
                <Play className="h-5 w-5" />
                Explore Mezmurs
              </Button>
            </Link>
            <Link to="/posts">
              <Button
                size="lg"
                className="bg-background/20 hover:bg-background/30 text-primary-foreground border-2 border-primary-foreground/30"
              >
                Read Blog
              </Button>
            </Link>
          </div>
        </div>
        {/* Optional subtle overlay for smooth gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      </section>

      {/* Features Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            What We Offer
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="shadow-gold hover:shadow-elegant transition-smooth">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Music className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Ethiopian Mezmurs</CardTitle>
                <CardDescription>
                  Stream and download beautiful Orthodox Mezmurs with full
                  lyrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/mezmurs">
                  <Button variant="outline" className="w-full">
                    Browse Mezmurs
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="shadow-gold hover:shadow-elegant transition-smooth">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <FileText className="h-6 w-6 text-accent" />
                </div>
                <CardTitle>Blog & News</CardTitle>
                <CardDescription>
                  Read spiritual insights, news, and share your thoughts with
                  the community
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/posts">
                  <Button variant="outline" className="w-full">
                    Read Posts
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="shadow-gold hover:shadow-elegant transition-smooth">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-secondary/10 flex items-center justify-center mb-4">
                  <Bell className="h-6 w-6 text-secondary" />
                </div>
                <CardTitle>Announcements</CardTitle>
                <CardDescription>
                  Stay updated with the latest church news and important
                  announcements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/announcements">
                  <Button variant="outline" className="w-full">
                    View Announcements
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-muted py-16 px-4">
        <div className="container mx-auto text-center">
          <Music className="h-16 w-16 mx-auto mb-6 text-primary" />
          <h2 className="text-3xl font-bold mb-4">Join Our Community</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Create an account to like, comment, and contribute to our growing
            collection of Ethiopian Orthodox spiritual content.
          </p>
          <Link to="/auth">
            <Button size="lg">Get Started</Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
