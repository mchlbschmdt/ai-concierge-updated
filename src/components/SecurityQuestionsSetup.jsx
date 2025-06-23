
import { useState } from "react";
import { supabase } from "../integrations/supabase/client";
import { useToast } from "./ui/use-toast";
import { Button } from "./ui/button";

const SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "What is your mother's maiden name?",
  "What was the name of your elementary school?",
  "What city were you born in?",
  "What is your favorite movie?",
  "What was your childhood nickname?",
  "What is the name of the street you grew up on?",
  "What was your first car?",
  "What is your favorite food?",
  "What was the name of your first boss?"
];

export default function SecurityQuestionsSetup({ onComplete, onSkip }) {
  const [questions, setQuestions] = useState(['', '', '']);
  const [answers, setAnswers] = useState(['', '', '']);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleQuestionChange = (index, value) => {
    const newQuestions = [...questions];
    newQuestions[index] = value;
    setQuestions(newQuestions);
  };

  const handleAnswerChange = (index, value) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (questions.some(q => !q) || answers.some(a => !a)) {
      toast({
        variant: "destructive",
        title: "All fields required",
        description: "Please fill in all security questions and answers."
      });
      return;
    }

    if (new Set(questions).size !== 3) {
      toast({
        variant: "destructive",
        title: "Duplicate questions",
        description: "Please select different questions for each field."
      });
      return;
    }

    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("No authenticated user found");
      }

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          security_question_1: questions[0],
          security_answer_1: answers[0].toLowerCase().trim(),
          security_question_2: questions[1],
          security_answer_2: answers[1].toLowerCase().trim(),
          security_question_3: questions[2],
          security_answer_3: answers[2].toLowerCase().trim(),
        });

      if (error) throw error;

      toast({
        title: "Security questions saved",
        description: "Your security questions have been set up successfully."
      });
      
      onComplete();
    } catch (err) {
      console.error("Error saving security questions:", err);
      toast({
        variant: "destructive",
        title: "Setup failed",
        description: err.message || "Failed to save security questions."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Set Up Security Questions</h3>
        <p className="text-gray-600">
          These questions will help you reset your password if you forget it.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {[0, 1, 2].map((index) => (
          <div key={index} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Question {index + 1}
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={questions[index]}
              onChange={(e) => handleQuestionChange(index, e.target.value)}
              required
            >
              <option value="">Select a security question...</option>
              {SECURITY_QUESTIONS.filter(q => !questions.includes(q) || q === questions[index]).map((question) => (
                <option key={question} value={question}>
                  {question}
                </option>
              ))}
            </select>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your answer"
              value={answers[index]}
              onChange={(e) => handleAnswerChange(index, e.target.value)}
              required
            />
          </div>
        ))}

        <div className="flex space-x-3">
          <Button 
            type="submit" 
            disabled={loading}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Saving..." : "Save Security Questions"}
          </Button>
          
          <button
            type="button"
            onClick={onSkip}
            className="flex-1 text-gray-600 hover:text-gray-700 py-2 px-4 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Skip for Now
          </button>
        </div>
      </form>
    </div>
  );
}
