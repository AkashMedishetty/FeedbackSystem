'use client';

import React from 'react';
import TypeformMultipleChoice from './TypeformMultipleChoice';

interface ChoiceOption {
  id: string;
  label: string;
  description?: string;
  icon?: string;
}

interface TypeformSingleSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: ChoiceOption[];
  disabled?: boolean;
  required?: boolean;
  error?: string;
  className?: string;
  showKeyboardHints?: boolean;
  onEnter?: () => void;
  variant?: 'cards' | 'buttons' | 'list';
}

export default function TypeformSingleSelect(props: TypeformSingleSelectProps) {
  const handleChange = (value: string | string[]) => {
    if (typeof value === 'string') {
      props.onChange(value);
    }
  };

  return (
    <TypeformMultipleChoice
      {...props}
      onChange={handleChange}
      multiple={false}
    />
  );
}