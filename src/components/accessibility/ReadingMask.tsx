import React, { useState, useEffect } from 'react';

const ReadingMask: React.FC = () => {
    const [mouseY, setMouseY] = useState(window.innerHeight / 2);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMouseY(e.clientY);
        };
        
        window.addEventListener('mousemove', handleMouseMove, { passive: true });
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    const bandHeight = 120; // Height of the focused reading area
    const topHeight = Math.max(0, mouseY - bandHeight / 2);

    return (
        <div 
            className="fixed inset-0 pointer-events-none" 
            style={{ zIndex: 99999, transition: 'opacity 0.2s ease-in-out' }}
            aria-hidden="true"
        >
            {/* Top dark area */}
            <div 
                style={{ 
                    position: 'absolute', 
                    top: 0, left: 0, right: 0, 
                    height: `${topHeight}px`, 
                    backgroundColor: 'rgba(0, 0, 0, 0.75)'
                }} 
            />
            
            {/* Clear focus band with subtle borders */}
            <div 
                style={{ 
                    position: 'absolute', 
                    top: `${topHeight}px`, 
                    left: 0, right: 0, 
                    height: `${bandHeight}px`, 
                    backgroundColor: 'transparent',
                    borderTop: '2px solid rgba(255, 200, 0, 0.3)',
                    borderBottom: '2px solid rgba(255, 200, 0, 0.3)'
                }} 
            />
            
            {/* Bottom dark area */}
            <div 
                style={{ 
                    position: 'absolute', 
                    top: `${topHeight + bandHeight}px`, 
                    left: 0, right: 0, bottom: 0, 
                    backgroundColor: 'rgba(0, 0, 0, 0.75)'
                }} 
            />
        </div>
    );
};

export default ReadingMask;
