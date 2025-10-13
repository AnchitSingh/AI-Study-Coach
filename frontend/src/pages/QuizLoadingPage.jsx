import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { extractFromCurrentPage, extractFromPDFResult, normalizeManualTopic } from '../utils/contentExtractor';
import { extractTextFromPDF } from '../utils/pdfExtractor';
import { SOURCE_TYPE } from '../utils/messages';
import aiStudyCoachAPI from '../services/api';
import BackgroundEffects from '../components/ui/BackgroundEffects';

const LoadingProgress = ({ steps, currentStep, streamMessage, questionTypes, completedQuestionTypes }) => (
    <div className="w-full max-w-md">
        <div className="bg-white/80 backdrop-blur-2xl rounded-3xl shadow-2xl overflow-hidden border border-white/60">
            {/* Header Section */}
            <div className="bg-gradient-to-br from-amber-400/10 via-orange-400/5 to-transparent p-6 border-b border-slate-100">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl blur-md opacity-60"></div>
                        <div className="relative w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center">
                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                    </div>
                    <div className="flex-1">
                        <h3 className="text-xl font-bold text-slate-800">Creating Magic ✨</h3>
                        <p className="text-slate-500 text-sm">Step {currentStep + 1} of {steps.length}</p>
                    </div>
                </div>

                {/* Overall Progress Bar */}
                <div className="mt-4 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-amber-400 via-orange-400 to-orange-500 transition-all duration-700 ease-out rounded-full"
                        style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                    ></div>
                </div>
            </div>

            {/* Steps Section */}
            <div className="p-6 space-y-3">
                {steps.map((step, index) => {
                    const isCompleted = index < currentStep;
                    const isCurrent = index === currentStep;
                    const isStep3 = index === 2; // 3rd step (0-indexed)

                    return (
                        <div
                            key={index}
                            className={`relative overflow-hidden transition-all duration-500 rounded-2xl ${isCurrent
                                    ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 shadow-lg shadow-amber-100'
                                    : isCompleted
                                        ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200'
                                        : 'bg-slate-50/50 border border-slate-200'
                                }`}
                        >
                            {/* Animated background for current step */}
                            {isCurrent && (
                                <div className="absolute inset-0 bg-gradient-to-r from-amber-200/20 to-orange-200/20 animate-pulse"></div>
                            )}

                            <div className="relative p-4">
                                <div className="flex items-center gap-4">
                                    {/* Icon */}
                                    <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${isCompleted
                                            ? 'bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg'
                                            : isCurrent
                                                ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg'
                                                : 'bg-white border-2 border-slate-300'
                                        }`}>
                                        {isCompleted ? (
                                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                            </svg>
                                        ) : isCurrent ? (
                                            <svg className="animate-spin w-5 h-5 text-white" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        ) : (
                                            <div className="w-2.5 h-2.5 bg-slate-400 rounded-full"></div>
                                        )}
                                    </div>

                                    {/* Text */}
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-semibold transition-colors ${isCompleted ? 'text-green-800' :
                                                isCurrent ? 'text-amber-900' : 'text-slate-500'
                                            }`}>
                                            {step.title}
                                        </p>
                                    </div>

                                    {/* Status Badge */}
                                    {isCompleted && (
                                        <div className="flex-shrink-0">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-green-100 text-green-800">
                                                Done
                                            </span>
                                        </div>
                                    )}
                                    {isCurrent && (
                                        <div className="flex-shrink-0">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-100 text-amber-800">
                                                Processing
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* GitHub-style Question Types List - Only show in step 3 when current */}
                                {isStep3 && isCurrent && questionTypes && questionTypes.length > 0 && (
                                    <div className="mt-4 ml-14 space-y-2">
                                        {questionTypes.map((type, typeIndex) => {
                                            const isTypeCompleted = completedQuestionTypes.includes(type);
                                            const isTypeCurrent = !isTypeCompleted && typeIndex === completedQuestionTypes.length;
                                            const isPending = !isTypeCompleted && !isTypeCurrent;

                                            return (
                                                <div
                                                    key={typeIndex}
                                                    className={`flex items-center gap-2.5 py-1.5 px-2 rounded-lg transition-all ${isTypeCurrent ? 'bg-amber-100/50' : ''
                                                        }`}
                                                >
                                                    {/* Status Icon */}
                                                    <div className="flex-shrink-0">
                                                        {isTypeCompleted ? (
                                                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        ) : isTypeCurrent ? (
                                                            <svg className="animate-spin w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                            </svg>
                                                        ) : (
                                                            <div className="w-4 h-4 rounded-full border-2 border-slate-300"></div>
                                                        )}
                                                    </div>

                                                    {/* Type Name */}
                                                    <span className={`text-sm font-medium ${isTypeCompleted
                                                            ? 'text-green-700'
                                                            : isTypeCurrent
                                                                ? 'text-amber-800'
                                                                : 'text-slate-500'
                                                        }`}>
                                                        {type}
                                                    </span>
                                                </div>
                                            );
                                        })}

                                        {/* Divider line */}
                                        <div className="border-t border-slate-200 my-2"></div>
                                    </div>
                                )}

                                {/* Stream Message */}
                                {isCurrent && streamMessage && (
                                    <p className={`text-xs font-medium animate-pulse ${isStep3 ? 'ml-14 mt-1' : 'ml-14 mt-2'
                                        } text-amber-700`}>
                                        {streamMessage}
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    </div>
);

const QuizLoadingPage = ({ onNavigate, navigationData }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [streamMessage, setStreamMessage] = useState('');
    const [completedQuestionTypes, setCompletedQuestionTypes] = useState([]);
    const { config } = navigationData || {};

    const steps = [
        { title: 'Analyzing Content Source' },
        { title: 'Extracting Key Information' },
        { title: 'Generating Questions with AI' },
    ];

    // Determine the question types from config
    const questionTypes = config?.questionTypes || [];

    useEffect(() => {
        if (!config) {
            toast.error("No quiz configuration found.");
            onNavigate('home');
            return;
        }

        // Track the question type progress
        const allQuestionTypes = [...(config.questionTypes || [])];
        const processedTypes = new Set(); // Track completed types

        // Initialize the completed types state
        setCompletedQuestionTypes([]);

        let lastChunkCount = 0;
        let chunkCountIncreased = false;

        const handleStreamProgress = (progress) => {
            if (progress.status === 'streaming') {
                const currentChunkCount = progress.receivedChunks;

                // Check if we just started a new question type (chunk count reset)
                if (currentChunkCount < lastChunkCount) {
                    // A new question type has started, which means the previous one completed
                    if (allQuestionTypes.length > 0 && processedTypes.size < allQuestionTypes.length) {
                        const nextType = allQuestionTypes[processedTypes.size];
                        if (nextType) {
                            processedTypes.add(nextType);
                            setCompletedQuestionTypes(Array.from(processedTypes));
                        }
                    }
                    chunkCountIncreased = false; // Reset since we're starting a new type
                }
                // Check if chunk count has increased for the first time since a reset
                else if (currentChunkCount > lastChunkCount && !chunkCountIncreased) {
                    chunkCountIncreased = true; // Mark that we've started receiving data
                }

                lastChunkCount = currentChunkCount;
                setStreamMessage(`Fetching ${currentChunkCount} data chunks...`);
            }
        };

        const generate = async () => {
            let extractedSource;
            try {
                // Step 1: Analyzing
                setCurrentStep(0);
                await new Promise(res => setTimeout(res, 500)); // visual delay

                // Step 2: Extracting
                setCurrentStep(1);
                switch (config.sourceType) {
                    case SOURCE_TYPE.PAGE:
                        // Check if the selected tab is a PDF
                        if (config.selectedTab && config.selectedTab.url && config.selectedTab.url.toLowerCase().endsWith('.pdf')) {
                            // Create a progress callback for this extraction
                            const progressCallback = (progress) => {
                                setStreamMessage(progress.message || '');
                            };

                            try {

                                const { text, meta } = await extractTextFromPDF(config.selectedTab.url);
                                extractedSource = await extractFromPDFResult({
                                    text,
                                    fileName: config.selectedTab.url.split('/').pop() || 'PDF Document',
                                    pageCount: meta.pageCount
                                }, config, progressCallback);

                            } catch (error) {
                                console.error('Failed to extract PDF from tab URL:', error);
                                // If PDF extraction fails, fall back to normal page extraction
                                extractedSource = await extractFromCurrentPage(config);
                            }
                        } else {
                            extractedSource = await extractFromCurrentPage(config);
                        }
                        break;
                    case SOURCE_TYPE.PDF:
                        if (config.pdfFile) {
                            const { text, meta } = await extractTextFromPDF(config.pdfFile);
                            extractedSource = await extractFromPDFResult({
                                text,
                                fileName: config.pdfFile.name,
                                pageCount: meta.pageCount
                            });
                        }
                        break;
                    case SOURCE_TYPE.URL:
                        // Check if the URL is a PDF file
                        if (config.sourceValue && config.sourceValue.toLowerCase().endsWith('.pdf')) {
                            // Create a progress callback for this extraction
                            const progressCallback = (progress) => {
                                setStreamMessage(progress.message || '');
                            };

                            // Treat it as a PDF URL and extract content
                            try {

                                const { text, meta } = await extractTextFromPDF(config.sourceValue);
                                extractedSource = await extractFromPDFResult({
                                    text,
                                    fileName: config.sourceValue.split('/').pop() || 'PDF Document',
                                    pageCount: meta.pageCount
                                }, config, progressCallback);

                            } catch (error) {
                                console.error('Failed to extract PDF from URL:', error);
                                // If PDF extraction fails, fall back to treating it as a regular URL
                                extractedSource = normalizeManualTopic(config.sourceValue, `Content from ${config.sourceValue}`);
                            }
                        } else {
                            extractedSource = normalizeManualTopic(config.sourceValue, `Content from ${config.sourceValue}`);
                        }
                        break;
                    case SOURCE_TYPE.MANUAL:
                    default:
                        extractedSource = normalizeManualTopic(config.topic, config.context);
                        break;
                }

                if (!extractedSource || !extractedSource.text) {
                    throw new Error("Could not extract any content from the source.");
                }

                // Step 3: Generating Questions
                setCurrentStep(2);

                const finalQuizConfig = {
                    ...config,
                    extractedSource,
                    topic: config.topic || extractedSource.title,
                };

                // Call the API with a custom progress handler to track question type completion
                const response = await aiStudyCoachAPI.generateQuiz(finalQuizConfig, handleStreamProgress);

                if (!response.success) {
                    throw new Error(response.error || "Failed to generate quiz questions.");
                }

                // Mark all remaining types as completed after API call finishes
                // This handles the case where the last type doesn't trigger a chunk reset
                if (processedTypes.size < allQuestionTypes.length) {
                    const remainingTypes = allQuestionTypes.filter(type => !processedTypes.has(type));
                    remainingTypes.forEach(type => processedTypes.add(type));
                    setCompletedQuestionTypes(Array.from(processedTypes));
                }

                // Navigate with the final, generated quiz data
                onNavigate('quiz', { quizConfig: { quizData: response.data } });

            } catch (error) {
                console.error('Failed to prepare quiz:', error);
                toast.error(`Error: ${error.message}`);
                onNavigate('home');
            }
        };

        generate();
    }, [config, onNavigate]);

    return (
        <div className="antialiased bg-gradient-to-br from-slate-50 via-white to-amber-50/30 text-slate-900 min-h-screen flex items-center justify-center p-4">
            <BackgroundEffects />
            <LoadingProgress
                steps={steps}
                currentStep={currentStep}
                streamMessage={streamMessage}
                questionTypes={questionTypes}
                completedQuestionTypes={completedQuestionTypes}
            />
        </div>
    );
};

export default QuizLoadingPage;