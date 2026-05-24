"use client";

import Header from "./components/Header";
import ChatSection from "./components/ChatSection";

export default function Home() {
  return (
    <main className="min-h-screen bg-stone-50 flex flex-col">
      <Header />
      <div className="flex-1 overflow-hidden">
        <ChatSection />
      </div>
    </main>
  );
}
