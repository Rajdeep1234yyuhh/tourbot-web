import Header from "../components/Header";
import HowItWorks from "../components/HowItWorks";
import Footer from "../components/Footer";

export const metadata = {
  title: "How it works · TourBot",
  description: "Architecture and pipeline of the Assamese-English tourism chatbot.",
};

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen bg-stone-50">
      <Header />
      <HowItWorks />
      <Footer />
    </main>
  );
}
