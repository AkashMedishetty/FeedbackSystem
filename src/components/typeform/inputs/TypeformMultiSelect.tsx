'use client';

import React from 'react';
import TypeformMultipleChoice from './TypeformMultipleChoice';

interface ChoiceOption {
  id: string;
  label: string;
  description?: string;
  icon?: string;
}

interface TypeformMultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  options: ChoiceOption[];
  disabled?: boolean;
  required?: boolean;
  error?: string;
  className?: string;
  maxSelections?: number;
  showKeyboardHints?: boolean;
  onEnter?: () => void;
  variant?: 'cards' | 'buttons' | 'list';
}

export default function TypeformMultiSelect(props: TypeformMultiSelectProps) {
  const handleChange = (value: string | string[]) => {
    if (Array.isArray(value)) {
      props.onChange(value);
    }
  };

  return (
    <TypeformMultipleChoice
      {...props}
      onChange={handleChange}
      multiple={true}
    />
  );
}