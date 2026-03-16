import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import type { InterviewQuestion, UserSettings } from '../types';
import { Mic, MicOff, Send, Waves, Timer, Volume2, Keyboard, Eye } from 'lucide-react';

// Extend Window for SpeechRecognition
interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

export default function InterviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [question, setQuestion] = useState<InterviewQuestion | null>(null);
  const [response, setResponse] = useState('');
  const [timeLeft, setTimeLeft] = useState(120);
  const [maxTime, setMaxTime] = useState(120);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [hasStartedSpeaking, setHasStartedSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [timerActive, setTimerActive] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load settings + first question
  useEffect(() => {
    const load = async () => {
      try {
        const [settingsRes] = await Promise.all([api.get('/users/me/settings')]);
        const s: UserSettings = settingsRes.data;
        setSettings(s);
        setMaxTime(s.response_time_limit);
        setTimeLeft(s.response_time_limit);
      } catch {
        // Use defaults
        setMaxTime(120);
        setTimeLeft(120);
      }
      setLoaded(true);
    };
    load();
  }, []);

  // Speak question when it changes
  useEffect(() => {
    if (!question || !settings || !loaded) return;
    speakQuestion(question.question_text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question?.question_id, loaded]);

  // Timer countdown
  useEffect(() => {
    if (!timerActive) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setTimerActive(false);
          // Use latest state values at timeout instead of a stale
          // closure by constructing the full response here.
          setIsSubmitting(true);
          const fullResponse = `${response} ${interimTranscript}`.trim();
          api
            .post(`/interviews/${id}/respond`, {
              question_id: question?.question_id,
              response_text: fullResponse || '(No response provided)',
            })
            .then((res) => {
              setResponse('');
              setInterimTranscript('');
              if (res.data.is_complete) {
                setIsComplete(true);
                setCompleting(true);
                api
                  .post(`/interviews/${id}/complete`)
                  .then(() => navigate(`/feedback/${id}`))
                  .catch(() => navigate(`/feedback/${id}`));
              } else if (res.data.next_question) {
                setQuestion(res.data.next_question);
                setTimeLeft(maxTime);
              }
            })
            .catch(() => {
              alert('Failed to submit response. Please try again.');
            })
            .finally(() => {
              setIsSubmitting(false);
            });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerActive, response, interimTranscript, id, maxTime, question]);

  const speakQuestion = async (text: string) => {
    // Reset sync flag for new question
    setHasStartedSpeaking(false);
    const voice = settings?.interviewer_voice || 'off';
    if (voice === 'off') {
      // No audio, but show text immediately
      setHasStartedSpeaking(true);
      onSpeechEnd();
      return;
    }

    if (voice === 'browser') {
      // Use browser SpeechSynthesis
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.onstart = () => {
        setIsSpeaking(true);
        setHasStartedSpeaking(true);
      };
      utterance.onend = () => {
        setIsSpeaking(false);
        onSpeechEnd();
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        setHasStartedSpeaking(true);
        onSpeechEnd();
      };
      speechSynthesis.cancel();
      speechSynthesis.speak(utterance);
    } else {
      // Use OpenAI TTS
      try {
        const res = await api.post('/interviews/tts', { text, voice }, { responseType: 'blob' });
        const url = URL.createObjectURL(res.data);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onplay = () => {
          setIsSpeaking(true);
          setHasStartedSpeaking(true);
        };
        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(url);
          onSpeechEnd();
        };
        audio.onerror = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(url);
          // Fallback to browser
          const fallback = new SpeechSynthesisUtterance(text);
          fallback.onstart = () => {
            setIsSpeaking(true);
            setHasStartedSpeaking(true);
          };
          fallback.onend = () => {
            setIsSpeaking(false);
            onSpeechEnd();
          };
          fallback.onerror = () => {
            setIsSpeaking(false);
            setHasStartedSpeaking(true);
            onSpeechEnd();
          };
          speechSynthesis.speak(fallback);
        };
        audio.play();
      } catch {
        // Fallback to browser TTS
        const fallback = new SpeechSynthesisUtterance(text);
        fallback.onstart = () => {
          setIsSpeaking(true);
          setHasStartedSpeaking(true);
        };
        fallback.onend = () => {
          setIsSpeaking(false);
          onSpeechEnd();
        };
        fallback.onerror = () => {
          setIsSpeaking(false);
          setHasStartedSpeaking(true);
          onSpeechEnd();
        };
        speechSynthesis.speak(fallback);
      }
    }
  };

  const onSpeechEnd = () => {
    // Start recording and timer
    setTimeLeft(maxTime);
    setTimerActive(true);
    startRecording();
  };

  const startRecording = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      // No speech recognition available
      alert(
        'Speech recognition is not supported in this browser. You can type your answers or switch to a browser that supports speech-to-text (e.g. Chrome on desktop).',
      );
      setIsRecording(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let final = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript + ' ';
        } else {
          interim += result[0].transcript;
        }
      }
      if (final) {
        setResponse((prev) => (prev + ' ' + final).trim());
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = () => {
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setIsRecording(true);
    } catch {
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
    setInterimTranscript('');
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleSubmitResponse = useCallback(async () => {
    if (!question || isSubmitting) return;

    stopRecording();
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerActive(false);
    setIsSubmitting(true);

    // Combine committed response text with any interim transcript so
    // that when time runs out, the full spoken answer is submitted.
    const fullResponse = `${response} ${interimTranscript}`.trim();

    try {
      const res = await api.post(`/interviews/${id}/respond`, {
        question_id: question.question_id,
        response_text: fullResponse || '(No response provided)',
      });

      setResponse('');
      setInterimTranscript('');

      if (res.data.is_complete) {
        setIsComplete(true);
        // Auto-complete the interview
        setCompleting(true);
        try {
          await api.post(`/interviews/${id}/complete`);
          navigate(`/feedback/${id}`);
        } catch {
          navigate(`/feedback/${id}`);
        }
      } else if (res.data.next_question) {
        setQuestion(res.data.next_question);
        setTimeLeft(maxTime);
      }
    } catch {
      alert('Failed to submit response. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question, response, interimTranscript, id, maxTime, isSubmitting]);

  // Load first question
  useEffect(() => {
    if (!id || question) return;

    // Check sessionStorage first (set by dashboard when starting)
    const stored = sessionStorage.getItem(`interview_${id}_question`);
    if (stored) {
      setQuestion(JSON.parse(stored));
      sessionStorage.removeItem(`interview_${id}_question`);
      return;
    }

    // Fallback: fetch current question from backend (e.g. page refresh)
    api
      .get(`/interviews/${id}/current-question`)
      .then((r) => setQuestion(r.data))
      .catch(() => {
        // Maybe the interview is already completed
        api
          .get(`/interviews/${id}/feedback`)
          .then(() => navigate(`/feedback/${id}`))
          .catch(() => navigate('/dashboard'));
      });
  }, [id, navigate, question]);

  // Cleanup
  useEffect(() => {
    return () => {
      stopRecording();
      speechSynthesis.cancel();
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const immersive = settings?.immersive_mode || false;

  // Format time
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const timePercent = maxTime > 0 ? (timeLeft / maxTime) * 100 : 100;

  if (!loaded || (!question && !isComplete)) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Preparing your interview...</p>
        </div>
      </div>
    );
  }

  if (isComplete || completing) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg font-semibold">Generating your feedback...</p>
          <p className="text-slate-400 mt-1">Our AI is reviewing your responses</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Top bar */}
      <header className="h-14 border-b border-slate-800 flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <Waves className="w-5 h-5 text-brand-400" />
          <span className="font-bold text-sm">
            Interview<span className="text-brand-400">Diver</span>
          </span>
        </div>
        {!immersive && question && (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span>
              Question {question.question_number} of {question.total_main_questions}
            </span>
            {question.question_type === 'probing' && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-medium">
                Follow-up
              </span>
            )}
          </div>
        )}
        <div className="w-20" /> {/* Spacer */}
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-3xl mx-auto w-full">
        {/* Question preparing state (audio + text sync) */}
        {question && !hasStartedSpeaking && (
          <div className="mb-8 flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">Preparing your question...</p>
          </div>
        )}

        {/* Question */}
        {!immersive && question && hasStartedSpeaking && (
          <div className="w-full mb-8">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <div className="flex items-start gap-3">
                {isSpeaking && (
                  <div className="mt-1">
                    <Volume2 className="w-5 h-5 text-brand-400 animate-pulse" />
                  </div>
                )}
                <p className="text-lg leading-relaxed">{question.question_text}</p>
              </div>
            </div>
          </div>
        )}

        {/* Immersive mode indicator */}
        {immersive && hasStartedSpeaking && (
          <div className="mb-8 flex flex-col items-center gap-4">
            {isSpeaking ? (
              <>
                <Volume2 className="w-12 h-12 text-brand-400 animate-pulse" />
                <p className="text-slate-400">Listening to question...</p>
              </>
            ) : (
              <>
                <Eye className="w-12 h-12 text-slate-600" />
                <p className="text-slate-400">Immersive Mode</p>
              </>
            )}
          </div>
        )}

        {/* Timer */}
        {timerActive && !immersive && (
          <div className="mb-6 flex items-center gap-3">
            <Timer className="w-5 h-5 text-slate-400" />
            <div className="w-48 h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  timePercent > 50
                    ? 'bg-brand-500'
                    : timePercent > 20
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                }`}
                style={{ width: `${timePercent}%` }}
              />
            </div>
            <span
              className={`font-mono text-sm font-semibold w-12 ${
                timePercent > 20 ? 'text-slate-300' : 'text-red-400'
              }`}
            >
              {formatTime(timeLeft)}
            </span>
          </div>
        )}

        {/* Recording indicator */}
        {isRecording && (
          <div className="mb-4 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500 recording-pulse" />
            <span className="text-sm text-red-400 font-medium">Recording</span>
          </div>
        )}

        {/* Response area */}
        {(hasStartedSpeaking && !isSpeaking && (!immersive || settings?.allow_typing)) && (
          <div className="w-full mb-6">
            <div className="relative">
              <textarea
                value={response + (interimTranscript ? ' ' + interimTranscript : '')}
                onChange={(e) => {
                  if (settings?.allow_typing) {
                    setResponse(e.target.value);
                  }
                }}
                readOnly={!settings?.allow_typing}
                rows={6}
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                placeholder={
                  settings?.allow_typing
                    ? 'Speak your answer or type here...'
                    : 'Speak your answer...'
                }
              />
              {settings?.allow_typing && (
                <Keyboard className="absolute right-3 top-3 w-4 h-4 text-slate-600" />
              )}
            </div>
          </div>
        )}

        {/* Action buttons */}
        {hasStartedSpeaking && !isSpeaking && (
          <div className="flex items-center gap-4">
            <button
              onClick={toggleRecording}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                isRecording
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
              title={isRecording ? 'Stop recording' : 'Start recording'}
            >
              {isRecording ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>

            <button
              onClick={handleSubmitResponse}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold transition-colors disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
              {isSubmitting ? 'Sending...' : 'Send Response'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
