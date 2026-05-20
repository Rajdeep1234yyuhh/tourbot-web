"use client";

import Header from "./components/Header";
import ChatSection from "./components/ChatSection";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-stone-50">
      <Header />
      <ChatSection />
      <Footer />
    </main>
  );
}
