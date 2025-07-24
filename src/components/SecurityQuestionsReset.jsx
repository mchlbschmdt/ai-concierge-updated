
import { useState, useEffect } from "react";
import { supabase } from "../integrations/supabase/client";
import { useToast } from "./ui/use-toast";
import { Button } from "./ui/button";

export default function SecurityQuestionsReset({ email, onSuccess, onBack }) {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState(['', '', '']);
  const [loading, setLoading] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchSecurityQuestions();
  }, [email]);

  const fetchSecurityQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, security_question_1, security_question_2, security_question_3, security_answer_1, security_answer_2, security_answer_3')
        .eq('email', email)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          toast({
            variant: "destructive",
            title: "User not found",
            description: "No account found with this email address."
          });
        } else {
          throw error;
        }
        return;
      }

      if (!data.security_question_1) {
        toast({
          variant: "destructive",
          title: "Security questions not set",
          description: "This account doesn't have security questions configured. Please use email reset instead."
        });
        return;
      }

      setUserProfile(data);
      setQuestions([
        data.security_question_1,
        data.security_question_2,
        data.security_question_3
      ]);
    } catch (err) {
      console.error("Error fetching security questions:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load security questions."
      });
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleAnswerChange = (index, value) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    
    if (answers.some(a => !a.trim())) {
      toast({
        variant: "destructive",
        title: "All answers required",
        description: "Please answer all security questions."
      });
      return;
    }

    setLoading(true);
    
    try {
      // Hash user answers and compare with stored hashed answers
      const hashedAnswers = await Promise.all(
        answers.map(async (answer) => {
          const { data, error } = await supabase.rpc('hash_security_answer', { answer });
          if (error) throw error;
          return data;
        })
      );

      const storedAnswers = [
        userProfile.security_answer_1,
        userProfile.security_answer_2,
        userProfile.security_answer_3
      ];

      const answersMatch = hashedAnswers.every((hashedAnswer, index) => 
        hashedAnswer === storedAnswers[index]
      );

      if (!answersMatch) {
        toast({
          variant: "destructive",
          title: "Incorrect answers",
          description: "One or more security answers are incorrect. Please try again."
        });
        return;
      }

      // If answers are correct, allow password reset
      onSuccess(userProfile.id);
      
    } catch (err) {
      console.error("Error verifying security questions:", err);
      toast({
        variant: "destructive",
        title: "Verification failed",
        description: "Failed to verify security answers."
      });
    } finally {
      setLoading(false);
    }
  };

  if (loadingQuestions) {
    return (
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 mt-2">Loading security questions...</p>
      </div>
    );
  }

  if (!questions[0]) {
    return (
      <div className="text-center space-y-4">
        <div className="mx-auto w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900">No Security Questions Found</h3>
        <p className="text-gray-600">
          This account doesn't have security questions set up. Please use the email reset option instead.
        </p>
        <Button onClick={onBack} className="mt-4">
          Back to Reset Options
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Answer Security Questions</h3>
        <p className="text-gray-600">
          Please answer your security questions to reset your password.
        </p>
      </div>

      <form onSubmit={handleVerify} className="space-y-4">
        {questions.map((question, index) => (
          <div key={index} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {question}
            </label>
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

        <div className="space-y-3">
          <Button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Verifying..." : "Verify Answers"}
          </Button>
          
          <button
            type="button"
            onClick={onBack}
            className="w-full text-gray-600 hover:text-gray-700 py-2"
          >
            Back to Reset Options
          </button>
        </div>
      </form>
    </div>
  );
}
