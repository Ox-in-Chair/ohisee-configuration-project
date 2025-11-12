'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icons';
import { ICONS } from '@/lib/config/icons';
import { ncaTrainingModule, type TrainingModule } from '@/lib/training/nca-training-content';

interface NCATrainingModuleProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NCATrainingModule({ open, onOpenChange }: NCATrainingModuleProps) {
  const [currentSection, setCurrentSection] = useState(0);
  const [showCheckpoint, setShowCheckpoint] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [showResults, setShowResults] = useState(false);

  const module = ncaTrainingModule;
  const currentSectionData = module.sections[currentSection];

  const handleNext = () => {
    if (currentSection < module.sections.length - 1) {
      setCurrentSection(currentSection + 1);
    } else {
      setShowCheckpoint(true);
    }
  };

  const handlePrevious = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
    }
  };

  const handleAnswerSelect = (questionId: string, answerIndex: number) => {
    setSelectedAnswers({ ...selectedAnswers, [questionId]: answerIndex });
  };

  const handleSubmitAnswers = () => {
    setShowResults(true);
  };

  const calculateScore = () => {
    const correct = module.checkpointQuestions.filter(
      (q) => selectedAnswers[q.id] === q.correctAnswer
    ).length;
    return { correct, total: module.checkpointQuestions.length };
  };

  const score = showResults ? calculateScore() : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name={ICONS.BOOK_OPEN} size="md" />
            {module.title}
          </DialogTitle>
          <DialogDescription>{module.description}</DialogDescription>
        </DialogHeader>

        {!showCheckpoint && !showResults && (
          <div className="space-y-6">
            {/* Progress Indicator */}
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>
                Section {currentSection + 1} of {module.sections.length}
              </span>
              <Badge variant="outline">
                {currentSectionData.brcgsReference && `BRCGS: ${currentSectionData.brcgsReference}`}
                {currentSectionData.brcgsReference && currentSectionData.procedureReference && ' • '}
                {currentSectionData.procedureReference && currentSectionData.procedureReference}
              </Badge>
            </div>

            {/* Section Content */}
            <Card>
              <CardHeader>
                <CardTitle>{currentSectionData.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                  {currentSectionData.content.split('\n').map((line, idx) => {
                    if (line.startsWith('**') && line.endsWith('**')) {
                      return (
                        <strong key={idx} className="block mt-4 mb-2">
                          {line.replace(/\*\*/g, '')}
                        </strong>
                      );
                    }
                    if (line.trim() === '') {
                      return <br key={idx} />;
                    }
                    return <p key={idx} className="mb-2">{line}</p>;
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentSection === 0}
              >
                <Icon name={ICONS.ARROW_LEFT} size="sm" className="mr-2" />
                Previous
              </Button>
              <Button onClick={handleNext}>
                {currentSection < module.sections.length - 1 ? (
                  <>
                    Next
                    <Icon name={ICONS.ARROW_RIGHT} size="sm" className="ml-2" />
                  </>
                ) : (
                  'Start Checkpoint Questions'
                )}
              </Button>
            </div>
          </div>
        )}

        {showCheckpoint && !showResults && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Checkpoint Questions</h3>
            {module.checkpointQuestions.map((question, qIdx) => (
              <Card key={question.id}>
                <CardHeader>
                  <CardTitle className="text-base">
                    Question {qIdx + 1}: {question.question}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {question.options.map((option, optIdx) => (
                    <div
                      key={optIdx}
                      className={`p-3 border rounded cursor-pointer transition-colors ${
                        selectedAnswers[question.id] === optIdx
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleAnswerSelect(question.id, optIdx)}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded-full border-2 ${
                            selectedAnswers[question.id] === optIdx
                              ? 'border-primary bg-primary'
                              : 'border-gray-300'
                          }`}
                        />
                        <span>{option}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
            <Button onClick={handleSubmitAnswers} className="w-full">
              Submit Answers
            </Button>
          </div>
        )}

        {showResults && score && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-4">
                  <div className="text-4xl font-bold">
                    {score.correct} / {score.total}
                  </div>
                  <div className="text-lg text-gray-600">
                    {Math.round((score.correct / score.total) * 100)}% Correct
                  </div>
                </div>
              </CardContent>
            </Card>

            {module.checkpointQuestions.map((question, qIdx) => {
              const isCorrect = selectedAnswers[question.id] === question.correctAnswer;
              return (
                <Card key={question.id}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      Question {qIdx + 1}
                      {isCorrect ? (
                        <Icon name={ICONS.SUCCESS} size="md" className="text-green-600" />
                      ) : (
                        <Icon name={ICONS.ERROR} size="md" className="text-red-600" />
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="font-medium">{question.question}</p>
                    <div className="space-y-1">
                      {question.options.map((option, optIdx) => {
                        const isSelected = selectedAnswers[question.id] === optIdx;
                        const isCorrectAnswer = optIdx === question.correctAnswer;
                        return (
                          <div
                            key={optIdx}
                            className={`p-2 border rounded ${
                              isCorrectAnswer
                                ? 'border-green-500 bg-green-50'
                                : isSelected && !isCorrectAnswer
                                ? 'border-red-500 bg-red-50'
                                : 'border-gray-200'
                            }`}
                          >
                            {option}
                            {isCorrectAnswer && (
                              <Badge variant="outline" className="ml-2">
                                Correct Answer
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                      <strong>Explanation:</strong> {question.explanation}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => {
                setShowCheckpoint(false);
                setShowResults(false);
                setCurrentSection(0);
                setSelectedAnswers({});
              }}>
                Review Training Again
              </Button>
              <Button onClick={() => onOpenChange(false)} className="flex-1">
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

