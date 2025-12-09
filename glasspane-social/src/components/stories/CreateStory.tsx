import { useState, useRef } from 'react';
import { X, Image as ImageIcon, Video, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface CreateStoryProps {
    onClose: () => void;
    onStoryCreated: () => void;
}

export function CreateStory({ onClose, onStoryCreated }: CreateStoryProps) {
    const { dbUser } = useAuth();
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [caption, setCaption] = useState('');
    const [loading, setLoading] = useState(false);
    const [type, setType] = useState<'image' | 'video'>('image');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            const objectUrl = URL.createObjectURL(selectedFile);
            setPreview(objectUrl);
            setType(selectedFile.type.startsWith('video') ? 'video' : 'image');
        }
    };

    const handleSubmit = async () => {
        if (!file || !dbUser) return;

        setLoading(true);
        try {
            // Convert file to base64
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                try {
                    const base64 = reader.result as string;

                    const response = await fetch('https://stocial.eliverdiaz72.workers.dev/api/stories', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            user_id: dbUser.id,
                            image_url: base64,
                            caption,
                            type,
                            duration: type === 'video' ? 15 : 5 // Default durations
                        }),
                    });

                    if (response.ok) {
                        onStoryCreated();
                        onClose();
                    } else {
                        const errorData = await response.json();
                        console.error('Failed to create story:', errorData);
                    }
                } catch (error) {
                    console.error('Error during story creation fetch:', error);
                } finally {
                    setLoading(false);
                }
            };
            reader.onerror = (error) => {
                console.error('FileReader error:', error);
                setLoading(false);
            };
        } catch (error) {
            console.error('Error creating story:', error);
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-background rounded-xl w-full max-w-md overflow-hidden relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="p-6">
                    <h2 className="text-xl font-bold mb-4 text-center">Crear Historia</h2>

                    {!preview ? (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-muted-foreground/30 rounded-xl h-80 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
                        >
                            <div className="flex gap-4 mb-4">
                                <div className="p-4 bg-primary/10 rounded-full text-primary">
                                    <ImageIcon className="w-8 h-8" />
                                </div>
                                <div className="p-4 bg-blue-500/10 rounded-full text-blue-500">
                                    <Video className="w-8 h-8" />
                                </div>
                            </div>
                            <p className="text-muted-foreground font-medium">Sube una foto o video</p>
                            <p className="text-xs text-muted-foreground mt-2">Arrastra o haz clic para seleccionar</p>
                        </div>
                    ) : (
                        <div className="relative h-80 bg-black rounded-xl overflow-hidden mb-4 group">
                            {type === 'video' ? (
                                <video src={preview} className="w-full h-full object-contain" controls />
                            ) : (
                                <img src={preview} alt="Preview" className="w-full h-full object-contain" />
                            )}
                            <button
                                onClick={() => { setFile(null); setPreview(null); }}
                                className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*,video/*"
                        className="hidden"
                    />

                    <div className="mt-4">
                        <input
                            type="text"
                            placeholder="Añade un texto..."
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            className="w-full bg-muted/50 border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary"
                        />
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={!file || loading}
                        className="w-full mt-6 bg-primary text-primary-foreground font-semibold py-3 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Publicando...
                            </>
                        ) : (
                            'Compartir en tu historia'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
