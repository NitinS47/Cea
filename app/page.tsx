"use client";
import Head from "next/head";

import React, { useState, useEffect, useRef } from "react";

  let _voices: SpeechSynthesisVoice[] = [];

// Ensure we grab voices once they're loaded
if (typeof window !== "undefined") {
  const synth = window.speechSynthesis;
  const loadVoices = () => {
    const v = synth.getVoices();
    if (v.length) {
      _voices = v;
    }
  };
  synth.onvoiceschanged = loadVoices;
  loadVoices(); // initial attempt
}

const App = () => {
  const [messages, setMessages] = useState([
    { role: "system", content: "You are Cea, a compassionate and empathetic AI therapist. Your main objective is help people with their mental issues by talking to them as humanly as possible." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
// Use the correct type for the SpeechRecognition instance
// Define the SpeechRecognition type for TypeScript
type SpeechRecognitionType = typeof window extends { webkitSpeechRecognition: infer T }
  ? T
  : typeof window extends { SpeechRecognition: infer U }
    ? U
    : any;

const recognitionRef = useRef<SpeechRecognitionType | null>(null);

  // 🎙️ Setup Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      typeof window !== "undefined" &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = "en-US";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        sendMessage(transcript); // Auto-send
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event);
        setListening(false);
      };

      recognition.onend = () => setListening(false);

      recognitionRef.current = recognition;
    }
  }, []);

  const startListening = () => {
    if (recognitionRef.current && !listening) {
      setListening(true);
      recognitionRef.current.start();
    }
  };


  const sendMessage = async (overrideInput?: string) => {
    const messageText = overrideInput || input;
    if (!messageText.trim()) return;

    setLoading(true);

    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          messages: [...messages, { role: "user", content: messageText }],
        }),
      });

      const data = await res.json();

      if (!data.choices || !data.choices[0]) {
        console.error("Unexpected response:", data);
        alert("Oops! The AI couldn't respond. Try again later.");
        return;
      }

      const reply = data.choices[0].message;

      setMessages((prev) => [...prev, { role: "user", content: messageText }, reply]);
      setInput("");

      // 🔊 Speak response
      speak(reply.content);
    } catch (error) {
      console.error("Error fetching from Groq API:", error);
      alert("Network or server error. Please check your API key or connection.");
    } finally {
      setLoading(false);
    }
  };

const speak = async (text: string) => {
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error("ElevenLabs TTS failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    new Audio(url).play();
  } catch {
    console.warn("🟡 ElevenLabs failed, using browser TTS");

    // Wait briefly if voices not yet loaded
    if (!_voices.length) {
      await new Promise((r) => setTimeout(r, 100));
      _voices = window.speechSynthesis.getVoices();
    }

    const pref = [
      // Chrome / Edge
      "Google UK English Female", "Google US English Female",
      // macOS Safari
      "Samantha", "Victoria",
      // Windows (Edge/Firefox)
      "Microsoft Zira", "Microsoft Susan",
      // Generic
      "Karen", "Anna", "Amelia"
    ];

    // pick first matching preferred voice
    const voice =
      _voices.find(v => pref.some(name => v.name.includes(name))) ||
      // next best: any female voice
      _voices.find(v => /female|woman/i.test(v.name)) ||
      // last resort: default
      _voices[0];

    const u = new SpeechSynthesisUtterance(text);
    u.voice = voice!;
    u.lang = voice?.lang || "en-US";
    u.rate = 0.95;
    u.pitch = 1;
    window.speechSynthesis.speak(u);
  }
};
  
  return (
    <>
      <Head>
        <title>Cea</title>
        <meta name="description" content="Cea - Your AI Therapist" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
   <main className="min-h-screen bg-gradient-to-b from-[#ADD8E6] to-[#F5F5DC] p-4">
<link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap" rel="stylesheet" />
<div className="max-w-2xl mx-auto bg-white/90 rounded-2xl shadow-xl p-6 space-y-6 relative border border-[#ADD8E6]">
    <h1 className="text-center font-[Lato]">
  <img 
    src="/CeaLogo.png"  // Put your logo file in the public folder or adjust path accordingly
    alt="Cea" 
    className="mx-auto w-24 h-auto" // centers and sets width (adjust size as needed)
  />
  <span className="block text-lg text-gray-600 mt-2">Your AI Therapist</span>
</h1>

    {/* Chat Area */}
    <div className="max-h-[60vh] overflow-y-auto flex flex-col space-y-4 border rounded-xl p-4 bg-[#fdfdfd]">
      {messages.slice(1).map((msg, idx) => (
        <div
          key={idx}
          className={`flex ${
            msg.role === "user" ? "justify-end" : "justify-start"
          }`}
        >
          <div
            className={`max-w-[70%] px-4 py-2 rounded-2xl shadow ${
              msg.role === "user"
  ? "bg-[#C7B8EA] text-right"
  : "bg-[#F5F5DC] text-left"
            }`}
          >
            <p className="text-sm text-gray-800">
              <strong>{msg.role === "user" ? "You" : "Cea"}:</strong>{" "}
              {msg.content}
            </p>
          </div>
        </div>
      ))}
      {loading && (
        <div className="text-gray-500 text-sm italic animate-pulse animate-fadeIn">Cea is typing...</div>
      )}
    </div>

    {/* Input Area */}
    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
      <input
className="flex-1 p-3 text-black border border-[#C7B8EA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ADD8E6]"        placeholder="What's on your mind?"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
      />
      <button
className="bg-[#C7B8EA] hover:bg-[#B5A5E0] text-white px-4 py-2 rounded-lg"
        onClick={() => sendMessage()}
        disabled={loading}
      >
        {loading ? "..." : "Send"}
      </button>
    </div>

    {/* 🎤 Voice Button Floating Bottom Right */}
    <button
       className={`fixed bottom-6 right-6 sm:static sm:ml-auto w-14 h-14 rounded-full shadow-xl transition-colors ${
    listening ? "bg-red-400" : "bg-[#C7B8EA]"
  } text-white text-2xl flex items-center justify-center`}
      onClick={startListening}
      title="Voice Input"
    >
      🎤
    </button>
  </div>
</main>
</>
  );
};

export default App;
