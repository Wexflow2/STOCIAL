import { Link } from "react-router-dom";

/**
 * Parse caption text to make hashtags and mentions clickable
 * @param caption - The post caption text
 * @returns JSX with clickable hashtags and mentions
 */
export function parseCaption(caption: string): JSX.Element {
    if (!caption) return <></>;

    const parts: (string | JSX.Element)[] = [];
    let lastIndex = 0;

    // Combined regex for hashtags and mentions
    const regex = /(#[\w\u00C0-\u017F]+)|(@[\w\.]+)/g;
    let match;

    while ((match = regex.exec(caption)) !== null) {
        // Add text before match
        if (match.index > lastIndex) {
            parts.push(caption.slice(lastIndex, match.index));
        }

        const fullMatch = match[0];

        if (fullMatch.startsWith('#')) {
            // Hashtag
            const tag = fullMatch.slice(1);
            parts.push(
                <Link
                    key={`${match.index}-${fullMatch}`}
                    to={`/hashtag/${tag.toLowerCase()}`}
                    className="text-primary font-semibold hover:underline"
                    onClick={(e) => e.stopPropagation()}
                >
                    {fullMatch}
                </Link>
            );
        } else if (fullMatch.startsWith('@')) {
            // Mention
            const username = fullMatch.slice(1);
            parts.push(
                <Link
                    key={`${match.index}-${fullMatch}`}
                    to={`/profile?username=${username.toLowerCase()}`}
                    className="text-blue-400 font-semibold hover:underline"
                    onClick={(e) => e.stopPropagation()}
                >
                    {fullMatch}
                </Link>
            );
        }

        lastIndex = match.index + fullMatch.length;
    }

    // Add remaining text
    if (lastIndex < caption.length) {
        parts.push(caption.slice(lastIndex));
    }

    return <>{parts}</>;
}
