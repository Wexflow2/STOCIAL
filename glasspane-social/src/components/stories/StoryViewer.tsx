import { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Heart, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { VerifiedBadge, isVerifiedUser } from '@/components/VerifiedBadge';

interface Story {
    id: number;
    user_id: number;
    image_url: string;
    caption?: string;
    type: 'image' | 'video';
    duration: number;
    created_at: string;
}

interface StoryUser {
    user_id: number;
    username: string;
    avatar_url: string;
    stories: Story[];
}

interface StoryViewerProps {
    stories: StoryUser[];
    initialUserIndex: number;
    onClose: () => void;
    onUserStoriesSeen?: (userId: number) => void;
}

export function StoryViewer({ stories, initialUserIndex, onClose, onUserStoriesSeen }: StoryViewerProps) {
    const [currentUserIndex, setCurrentUserIndex] = useState(initialUserIndex);
    const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    const currentUser = stories[currentUserIndex];
    const currentStory = currentUser?.stories[currentStoryIndex];

    // Auto-advance logic
    useEffect(() => {
        if (!currentStory || isPaused) return;

        const duration = currentStory.duration * 1000; // Convert to ms
        const intervalTime = 50; // Update every 50ms
        const step = (intervalTime / duration) * 100;

        const timer = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) {
                    handleNextStory();
                    return 0;
                }
                return prev + step;
            });
        }, intervalTime);

        return () => clearInterval(timer);
    }, [currentStory, isPaused, currentUserIndex, currentStoryIndex]);

    // Reset progress when story changes
    useEffect(() => {
        setProgress(0);
        if (currentStory?.type === 'video' && videoRef.current) {
            videoRef.current.currentTime = 0;
            videoRef.current.play();
        }
    }, [currentUserIndex, currentStoryIndex]);

    const markUserSeen = () => {
        if (currentUser?.user_id && onUserStoriesSeen) {
            onUserStoriesSeen(currentUser.user_id);
        }
    };

    const handleNextStory = () => {
        if (currentStoryIndex < currentUser.stories.length - 1) {
            setCurrentStoryIndex(prev => prev + 1);
        } else if (currentUserIndex < stories.length - 1) {
            markUserSeen();
            setCurrentUserIndex(prev => prev + 1);
            setCurrentStoryIndex(0);
        } else {
            markUserSeen();
            onClose();
        }
    };

    const handlePrevStory = () => {
        if (currentStoryIndex > 0) {
            setCurrentStoryIndex(prev => prev - 1);
        } else if (currentUserIndex > 0) {
            setCurrentUserIndex(prev => prev - 1);
            setCurrentStoryIndex(stories[currentUserIndex - 1].stories.length - 1);
        }
    };

    if (!currentUser || !currentStory) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
            {/* Close button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 text-white z-50 p-2 hover:bg-white/10 rounded-full"
            >
                <X className="w-6 h-6" />
            </button>

            {/* Main Container */}
            <div className="relative w-full max-w-md h-full md:h-[90vh] bg-black md:rounded-xl overflow-hidden flex flex-col">

                {/* Progress Bars */}
                <div className="absolute top-0 left-0 right-0 z-20 p-2 flex gap-1">
                    {currentUser.stories.map((story, idx) => (
                        <div key={story.id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-white transition-all duration-100 ease-linear"
                                style={{
                                    width: idx < currentStoryIndex ? '100%' :
                                        idx === currentStoryIndex ? `${progress}%` : '0%'
                                }}
                            />
                        </div>
                    ))}
                </div>

                {/* Header */}
                <div className="absolute top-4 left-0 right-0 z-20 p-4 flex items-center justify-between mt-2">
                    <div className="flex items-center gap-3">
                        <img
                            src={currentUser.avatar_url || "https://via.placeholder.com/40"}
                            alt={currentUser.username}
                    className="w-8 h-8 rounded-full border border-white/20"
                  />
                        <span className="text-white font-semibold text-sm drop-shadow-md inline-flex items-center gap-1">
                            {currentUser.username}
                            {isVerifiedUser(currentUser.username) && <VerifiedBadge variant="blue" />}
                        </span>
                        <span className="text-white/70 text-xs drop-shadow-md">
                            {new Date(currentStory.created_at).getHours()}h
                        </span>
                    </div>
                </div>

                {/* Content */}
                <div
                    className="flex-1 relative bg-gray-900 flex items-center justify-center"
                    onMouseDown={() => setIsPaused(true)}
                    onMouseUp={() => setIsPaused(false)}
                    onTouchStart={() => setIsPaused(true)}
                    onTouchEnd={() => setIsPaused(false)}
                >
                    {currentStory.type === 'video' ? (
                        <video
                            ref={videoRef}
                            src={currentStory.image_url}
                            className="w-full h-full object-contain"
                            playsInline
                            muted // Muted for auto-play policy, add unmute button if needed
                            onEnded={handleNextStory}
                        />
                    ) : (
                        <img
                            src={currentStory.image_url}
                            alt="Story"
                            className="w-full h-full object-contain"
                        />
                    )}

                    {/* Navigation Areas */}
                    <div className="absolute inset-0 flex">
                        <div className="w-1/3 h-full" onClick={(e) => { e.stopPropagation(); handlePrevStory(); }} />
                        <div className="w-1/3 h-full" />
                        <div className="w-1/3 h-full" onClick={(e) => { e.stopPropagation(); handleNextStory(); }} />
                    </div>
                </div>

                {/* Footer / Caption */}
                {currentStory.caption && (
                    <div className="absolute bottom-20 left-0 right-0 p-4 text-center z-20">
                        <p className="text-white text-lg font-medium drop-shadow-md bg-black/20 p-2 rounded-lg inline-block backdrop-blur-sm">
                            {currentStory.caption}
                        </p>
                    </div>
                )}

                {/* Interaction Bar */}
                <div className="absolute bottom-0 left-0 right-0 p-4 z-20 flex items-center gap-4 bg-gradient-to-t from-black/80 to-transparent pt-10">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            placeholder={`Responder a ${currentUser.username}...`}
                            className="w-full bg-transparent border border-white/40 rounded-full py-2.5 px-4 text-white placeholder:text-white/70 focus:outline-none focus:border-white"
                        />
                    </div>
                    <button className="text-white hover:scale-110 transition-transform">
                        <Heart className="w-7 h-7" />
                    </button>
                    <button className="text-white hover:scale-110 transition-transform">
                        <Send className="w-7 h-7" />
                    </button>
                </div>

            </div>

            {/* Desktop Navigation Arrows */}
            <button
                onClick={handlePrevStory}
                className="hidden md:block absolute left-4 text-white/50 hover:text-white transition-colors"
                disabled={currentUserIndex === 0 && currentStoryIndex === 0}
            >
                <ChevronLeft className="w-10 h-10" />
            </button>
            <button
                onClick={handleNextStory}
                className="hidden md:block absolute right-4 text-white/50 hover:text-white transition-colors"
            >
                <ChevronRight className="w-10 h-10" />
            </button>
        </div>
    );
}
