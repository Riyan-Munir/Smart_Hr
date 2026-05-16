import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

const CustomSelect = ({ options, value, onChange, placeholder, labelKey = 'label', valueKey = 'value' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    const safeOptions = Array.isArray(options) ? options : [];
    const selectedOption = safeOptions.find(opt => {
        if (!opt || opt[valueKey] === undefined || opt[valueKey] === null) return false;
        if (value === undefined || value === null) return false;
        return opt[valueKey].toString() === value.toString();
    });

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="custom-select-container" ref={containerRef}>
            <div 
                className={`form-input custom-select-trigger ${isOpen ? 'active' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            >
                <span style={{ color: selectedOption ? 'var(--text)' : 'var(--text-dim)' }}>
                    {selectedOption ? selectedOption[labelKey] : placeholder}
                </span>
                <ChevronDown size={18} style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.3s ease' }} />
            </div>

            {isOpen && (
                <div className="custom-select-options glass no-scrollbar">
                    {safeOptions.map((opt) => (
                        <div 
                            key={opt[valueKey]} 
                            className={`custom-select-option ${value?.toString() === opt[valueKey]?.toString() ? 'selected' : ''}`}
                            onClick={() => {
                                onChange(opt[valueKey]);
                                setIsOpen(false);
                            }}
                        >
                            {opt[labelKey]}
                        </div>
                    ))}
                    {safeOptions.length === 0 && (
                        <div style={{ padding: '12px 16px', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                            No options available
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CustomSelect;
