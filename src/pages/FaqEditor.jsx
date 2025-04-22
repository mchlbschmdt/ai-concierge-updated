import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  query,
  where,
} from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function FaqEditor() {
  const [faqs, setFaqs] = useState([]);
  const [propertyFilter, setPropertyFilter] = useState("");
  const [newFaq, setNewFaq] = useState({ property_id: "", question_keywords: "", answer: "" });
  const [keywordSuggestions, setKeywordSuggestions] = useState([]);

  useEffect(() => {
    const fetchFaqs = async () => {
      const snapshot = await getDocs(collection(db, "faqs"));
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setFaqs(data);
    };
    fetchFaqs();

    const fetchKeywords = async () => {
      const snapshot = await getDocs(collection(db, "messages"));
      const keywordCounts = {};
      snapshot.docs.forEach((doc) => {
        const message = doc.data().message;
        if (message) {
          message.toLowerCase().split(/\W+/).forEach((word) => {
            if (word.length > 3) keywordCounts[word] = (keywordCounts[word] || 0) + 1;
          });
        }
      });
      const top = Object.entries(keywordCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word]) => word);
      setKeywordSuggestions(top);
    };
    fetchKeywords();
  }, []);

  const handleAdd = async () => {
    const formattedKeywords = newFaq.question_keywords.split(",").map((kw) => kw.trim().toLowerCase());
    const faqToSave = { ...newFaq, question_keywords: formattedKeywords };
    await addDoc(collection(db, "faqs"), faqToSave);
    setNewFaq({ property_id: "", question_keywords: "", answer: "" });
    const snapshot = await getDocs(collection(db, "faqs"));
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setFaqs(data);
  };

  const handleUpdate = async (id, key, value) => {
    const ref = doc(db, "faqs", id);
    const updated = key === "question_keywords" ? value.split(",").map((kw) => kw.trim().toLowerCase()) : value;
    await updateDoc(ref, { [key]: updated });
    setFaqs((prev) =>
      prev.map((faq) => (faq.id === id ? { ...faq, [key]: updated } : faq))
    );
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, "faqs", id));
    setFaqs((prev) => prev.filter((faq) => faq.id !== id));
  };

  const filteredFaqs = propertyFilter ? faqs.filter((f) => f.property_id === propertyFilter) : faqs;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">FAQ Management</h1>

      <div className="flex gap-2">
        <Input
          placeholder="Filter by property ID..."
          value={propertyFilter}
          onChange={(e) => setPropertyFilter(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredFaqs.map((faq) => (
          <Card key={faq.id} className="bg-white shadow-md p-4 rounded-xl">
            <CardContent className="space-y-2">
              <Input
                value={faq.property_id}
                onChange={(e) => handleUpdate(faq.id, "property_id", e.target.value)}
              />
              <Input
                value={Array.isArray(faq.question_keywords) ? faq.question_keywords.join(", ") : faq.question_keywords}
                onChange={(e) => handleUpdate(faq.id, "question_keywords", e.target.value)}
              />
              <Textarea
                value={faq.answer}
                onChange={(e) => handleUpdate(faq.id, "answer", e.target.value)}
              />
              <Button variant="destructive" onClick={() => handleDelete(faq.id)}>
                Delete
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-10">
        <h2 className="text-xl font-semibold mb-2">Add New FAQ</h2>
        <div className="grid gap-3">
          <Input
            placeholder="Property ID"
            value={newFaq.property_id}
            onChange={(e) => setNewFaq({ ...newFaq, property_id: e.target.value })}
          />
          <Input
            placeholder="Keywords (comma separated)"
            value={newFaq.question_keywords}
            onChange={(e) => setNewFaq({ ...newFaq, question_keywords: e.target.value })}
          />
          <Textarea
            placeholder="Answer"
            value={newFaq.answer}
            onChange={(e) => setNewFaq({ ...newFaq, answer: e.target.value })}
          />
          <Button onClick={handleAdd}>Add FAQ</Button>
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-medium mb-2">🔍 Suggested Keywords</h3>
          <div className="flex flex-wrap gap-2">
            {keywordSuggestions.map((word, i) => (
              <span
                key={i}
                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
              >
                {word}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
