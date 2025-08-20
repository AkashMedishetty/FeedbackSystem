'use client';

import React, { useState, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/Button';
import QuestionPreview from './QuestionPreview';
import { IQuestion, ITemplateQuestion } from '@/types';
import { 
  Plus, 
  GripVertical, 
  Eye, 
  Edit3, 
  Trash2, 
  Save, 
  Type, 
  Star, 
  CheckSquare, 
  ToggleLeft, 
  BarChart3, 
  Mail, 
  Phone, 
  Calendar,
  Copy,
  Download,
  Upload,
  Settings,
  Zap,
  FileText,
  Hash
} from 'lucide-react';

interface QuestionBuilderProps {
  questions?: IQuestion[] | ITemplateQuestion[];
  onSave?: (questions: IQuestion[] | ITemplateQuestion[]) => Promise<void>;
  onDelete?: (questionId: string) => Promise<void>;
  isLoading?: boolean;
}

interface QuestionFormData {
  type: 'text' | 'rating' | 'multipleChoice' | 'checkbox' | 'yesNo' | 'scale' | 'email' | 'phone' | 'date' | 'textarea' | 'number' | 'url' | 'file';
  title: string;
  description?: string;
  required: boolean;
  options?: string[];
  minValue?: number;
  maxValue?: number;
  placeholder?: string;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
  category?: string;
  tags?: string[];
}

const QUESTION_TYPES = [
  { 
    value: 'text', 
    label: 'Text Input', 
    icon: Type, 
    description: 'Single line text input',
    category: 'Basic'
  },
  { 
    value: 'textarea', 
    label: 'Long Text', 
    icon: FileText, 
    description: 'Multi-line text area',
    category: 'Basic'
  },
  { 
    value: 'number', 
    label: 'Number', 
    icon: Hash, 
    description: 'Numeric input field',
    category: 'Basic'
  },
  { 
    value: 'rating', 
    label: 'Rating', 
    icon: Star, 
    description: 'Star rating or numeric scale',
    category: 'Feedback'
  },
  { 
    value: 'scale', 
    label: 'Scale', 
    icon: BarChart3, 
    description: 'Numeric scale rating',
    category: 'Feedback'
  },
  { 
    value: 'multipleChoice', 
    label: 'Multiple Choice', 
    icon: CheckSquare, 
    description: 'Select from options',
    category: 'Selection'
  },
  { 
    value: 'checkbox', 
    label: 'Checkbox', 
    icon: CheckSquare, 
    description: 'Multiple selections allowed',
    category: 'Selection'
  },
  { 
    value: 'yesNo', 
    label: 'Yes/No', 
    icon: ToggleLeft, 
    description: 'Simple yes or no question',
    category: 'Selection'
  },
  { 
    value: 'email', 
    label: 'Email', 
    icon: Mail, 
    description: 'Email address input',
    category: 'Contact'
  },
  { 
    value: 'phone', 
    label: 'Phone', 
    icon: Phone, 
    description: 'Phone number input',
    category: 'Contact'
  },
  { 
    value: 'date', 
    label: 'Date', 
    icon: Calendar, 
    description: 'Date picker input',
    category: 'Advanced'
  },
  { 
    value: 'url', 
    label: 'URL', 
    icon: Zap, 
    description: 'Website URL input',
    category: 'Advanced'
  },
  { 
    value: 'file', 
    label: 'File Upload', 
    icon: Upload, 
    description: 'File upload field',
    category: 'Advanced'
  },
] as const;

export default function QuestionBuilder({ 
  questions = [], 
  onSave, 
  onDelete, 
  isLoading = false 
}: QuestionBuilderProps) {
  const [localQuestions, setLocalQuestions] = useState<(IQuestion | ITemplateQuestion)[]>(questions);

  // Sync with parent questions when they change
  React.useEffect(() => {
    setLocalQuestions(questions);
  }, [questions]);
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState<string | null>(null);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState<QuestionFormData>({
    type: 'text',
    title: '',
    description: '',
    required: false,
    options: [],
    placeholder: '',
    category: 'Basic',
    tags: [],
  });

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(localQuestions);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update order indexes
    const updatedItems = items.map((item, index) => ({
      ...item,
      orderIndex: index
    }));

    setLocalQuestions(updatedItems);
  }, [localQuestions]);

  const handleAddQuestion = useCallback(async () => {
    const newQuestionData = {
      type: formData.type,
      title: formData.title,
      description: formData.description,
      required: formData.required,
      options: formData.options?.filter(opt => opt.trim() !== ''),
      minValue: formData.minValue,
      maxValue: formData.maxValue,
      placeholder: formData.placeholder,
      validation: formData.validation,
    };

    try {
      const response = await fetch('/api/admin/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newQuestionData),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setLocalQuestions(prev => [...prev, result.data]);
        }
      }
    } catch (error) {
      console.error('Error creating question:', error);
    }

    setFormData({
      type: 'text',
      title: '',
      description: '',
      required: false,
      options: [],
      placeholder: '',
    });
    setShowAddForm(false);
  }, [formData]);

  const handleEditQuestion = useCallback((questionId: string) => {
    const question = localQuestions.find(q => ('_id' in q ? q._id : q.title) === questionId);
    if (question) {
      setFormData({
        type: question.type as QuestionFormData['type'],
        title: question.title,
        description: question.description || '',
        required: question.required,
        options: question.options || [],
        minValue: question.minValue,
        maxValue: question.maxValue,
        placeholder: question.placeholder || '',
        validation: question.validation,
      });
      setEditingQuestion(questionId);
    }
  }, [localQuestions]);

  const handleUpdateQuestion = useCallback(async () => {
    if (!editingQuestion) return;

    const updateData = {
      type: formData.type,
      title: formData.title,
      description: formData.description,
      required: formData.required,
      options: formData.options?.filter(opt => opt.trim() !== ''),
      minValue: formData.minValue,
      maxValue: formData.maxValue,
      placeholder: formData.placeholder,
      validation: formData.validation,
    };

    try {
      const response = await fetch(`/api/admin/questions/${editingQuestion}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setLocalQuestions(prev => prev.map(q => {
            const id = '_id' in q ? q._id : q.title;
            if (id === editingQuestion) {
              return result.data;
            }
            return q;
          }));
        }
      }
    } catch (error) {
      console.error('Error updating question:', error);
    }

    setEditingQuestion(null);
    setFormData({
      type: 'text',
      title: '',
      description: '',
      required: false,
      options: [],
      placeholder: '',
    });
  }, [editingQuestion, formData]);

  const handleDeleteQuestion = useCallback(async (questionId: string) => {
    if (onDelete && localQuestions.length > 0 && '_id' in localQuestions[0]) {
      await onDelete(questionId);
    }
    setLocalQuestions(prev => prev.filter(q => {
      const id = '_id' in q ? q._id : q.title;
      return id !== questionId;
    }));
  }, [localQuestions, onDelete]);

  const handleSave = useCallback(async () => {
    if (onSave) {
      await onSave(localQuestions);
    }
  }, [localQuestions, onSave]);

  const addOption = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      options: [...(prev.options || []), '']
    }));
  }, []);

  const updateOption = useCallback((index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options?.map((opt, i) => i === index ? value : opt) || []
    }));
  }, []);

  const removeOption = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options?.filter((_, i) => i !== index) || []
    }));
  }, []);

  const validateForm = useCallback(() => {
    if (!formData.title.trim()) return false;
    if (formData.type === 'multipleChoice' && (!formData.options || formData.options.filter(opt => opt.trim()).length < 2)) return false;
    if ((formData.type === 'rating' || formData.type === 'scale') && (!formData.maxValue || formData.maxValue < 1)) return false;
    return true;
  }, [formData]);

  // Filter questions based on search and category
  const filteredQuestions = localQuestions.filter(question => {
    const matchesSearch = question.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (question.description && question.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = filterCategory === 'all' || 
                           QUESTION_TYPES.find(t => t.value === question.type)?.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...Array.from(new Set(QUESTION_TYPES.map(t => t.category)))];

  // Bulk operations
  const handleSelectAll = () => {
    if (selectedQuestions.length === filteredQuestions.length) {
      setSelectedQuestions([]);
    } else {
      const allIds = filteredQuestions.map(q => '_id' in q ? q._id : `${q.title}-${localQuestions.indexOf(q)}`);
      setSelectedQuestions(allIds);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedQuestions.length === 0) return;
    
    if (confirm(`Are you sure you want to delete ${selectedQuestions.length} selected questions?`)) {
      try {
        for (const questionId of selectedQuestions) {
          await handleDeleteQuestion(questionId);
        }
        setSelectedQuestions([]);
      } catch (error) {
        console.error('Error deleting questions:', error);
        alert('Failed to delete questions');
      }
    }
  };

  const handleExportQuestions = () => {
    const questionsToExport = selectedQuestions.length > 0 
      ? localQuestions.filter(q => {
          const id = '_id' in q ? q._id : `${q.title}-${localQuestions.indexOf(q)}`;
          return selectedQuestions.includes(id);
        })
      : localQuestions;

    const dataStr = JSON.stringify(questionsToExport, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `questions-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Settings className="h-8 w-8 text-blue-600" />
              Question Builder
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Create, manage, and organize feedback questions with advanced features
            </p>
            <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                {localQuestions.length} Questions
              </span>
              <span className="flex items-center gap-1">
                <CheckSquare className="h-4 w-4" />
                {selectedQuestions.length} Selected
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => setShowTemplateManager(true)}
              className="flex items-center gap-2"
            >
              <Copy className="h-4 w-4" />
              Templates
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowAddForm(true)}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Question
            </Button>
            {selectedQuestions.length > 0 && (
              <Button
                variant="outline"
                onClick={handleDeleteSelected}
                className="flex items-center gap-2 text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
                Delete Selected
              </Button>
            )}
            {localQuestions.length > 0 && (
              <Button
                onClick={handleSave}
                isLoading={isLoading}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Save Changes
              </Button>
            )}
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mt-6">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Type className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category === 'all' ? 'All Categories' : category}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              onClick={handleExportQuestions}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Enhanced Question List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Question List ({filteredQuestions.length})
            </h3>
            {filteredQuestions.length > 0 && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedQuestions.length === filteredQuestions.length && filteredQuestions.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Select All
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="p-6">
          {filteredQuestions.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                <FileText className="h-12 w-12 text-gray-400" />
              </div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {localQuestions.length === 0 ? 'No questions yet' : 'No matching questions'}
              </h4>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                {localQuestions.length === 0 
                  ? 'Add your first question to get started with building your feedback form.'
                  : 'Try adjusting your search or filter criteria to find questions.'
                }
              </p>
              {localQuestions.length === 0 && (
                <Button
                  onClick={() => setShowAddForm(true)}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add First Question
                </Button>
              )}
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="questions">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-4"
                  >
                    {filteredQuestions.map((question, index) => {
                      const questionId = '_id' in question ? question._id : `${question.title}-${index}`;
                      const questionType = QUESTION_TYPES.find(t => t.value === question.type);
                      const isSelected = selectedQuestions.includes(questionId);
                      
                      return (
                        <Draggable
                          key={questionId}
                          draggableId={questionId}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`group relative p-5 border-2 rounded-xl transition-all duration-200 ${
                                snapshot.isDragging 
                                  ? 'shadow-xl border-blue-300 bg-blue-50 dark:bg-blue-900/20' 
                                  : isSelected
                                  ? 'border-blue-200 bg-blue-50/50 dark:bg-blue-900/10 dark:border-blue-700'
                                  : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500'
                              }`}
                            >
                              <div className="flex items-start gap-4">
                                {/* Selection Checkbox */}
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedQuestions([...selectedQuestions, questionId]);
                                    } else {
                                      setSelectedQuestions(selectedQuestions.filter(id => id !== questionId));
                                    }
                                  }}
                                  className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                
                                {/* Drag Handle */}
                                <div
                                  {...provided.dragHandleProps}
                                  className="mt-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-grab active:cursor-grabbing"
                                >
                                  <GripVertical className="h-5 w-5" />
                                </div>
                                
                                {/* Question Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-3 mb-2">
                                    <div className="flex items-center gap-2">
                                      {questionType?.icon && (
                                        <div className="p-1.5 rounded-lg bg-white dark:bg-gray-600 shadow-sm">
                                          {React.createElement(questionType.icon, { 
                                            className: "h-4 w-4 text-blue-600" 
                                          })}
                                        </div>
                                      )}
                                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                                        questionType?.category === 'Basic' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                        questionType?.category === 'Feedback' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                        questionType?.category === 'Selection' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                                        questionType?.category === 'Contact' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                        'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                                      }`}>
                                        {questionType?.label || question.type}
                                      </span>
                                    </div>
                                    {question.required && (
                                      <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-full">
                                        Required
                                      </span>
                                    )}
                                  </div>
                                  
                                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                                    {question.title}
                                  </h4>
                                  
                                  {question.description && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                      {question.description}
                                    </p>
                                  )}
                                  
                                  {/* Question Details */}
                                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                                    {question.options && question.options.length > 0 && (
                                      <span className="flex items-center gap-1">
                                        <Hash className="h-3 w-3" />
                                        {question.options.length} options
                                      </span>
                                    )}
                                    {question.minValue !== undefined && question.maxValue !== undefined && (
                                      <span className="flex items-center gap-1">
                                        <BarChart3 className="h-3 w-3" />
                                        Range: {question.minValue}-{question.maxValue}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Action Buttons */}
                                 <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                   <Button
                                     variant="ghost"
                                     size="sm"
                                     onClick={() => setPreviewQuestion(questionId)}
                                     className="flex items-center gap-1 text-gray-600 hover:text-blue-600"
                                   >
                                     <Eye className="h-4 w-4" />
                                     Preview
                                   </Button>
                                   <Button
                                     variant="ghost"
                                     size="sm"
                                     onClick={() => {
                                       setEditingQuestion(questionId);
                                       setFormData({
                                         type: question.type,
                                         title: question.title,
                                         description: question.description || '',
                                         required: question.required || false,
                                         options: question.options || [],
                                         minValue: question.minValue,
                                         maxValue: question.maxValue,
                                         placeholder: question.placeholder,
                                         category: questionType?.category || 'Basic',
                                         tags: (question as any).tags || []
                                       });
                                       setShowAddForm(true);
                                     }}
                                     className="flex items-center gap-1 text-gray-600 hover:text-green-600"
                                   >
                                     <Edit3 className="h-4 w-4" />
                                     Edit
                                   </Button>
                                   <Button
                                     variant="ghost"
                                     size="sm"
                                     onClick={() => handleDeleteQuestion(questionId)}
                                     className="flex items-center gap-1 text-gray-600 hover:text-red-600"
                                   >
                                     <Trash2 className="h-4 w-4" />
                                     Delete
                                   </Button>
                                 </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </div>
      </div>

      {/* Enhanced Add/Edit Question Form */}
      {(showAddForm || editingQuestion) && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                {editingQuestion ? (
                  <>
                    <Edit3 className="h-5 w-5 text-green-600" />
                    Edit Question
                  </>
                ) : (
                  <>
                    <Plus className="h-5 w-5 text-blue-600" />
                    Add New Question
                  </>
                )}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingQuestion(null);
                  setFormData({
                    type: 'text',
                    title: '',
                    description: '',
                    required: false,
                    options: [],
                    category: 'Basic',
                    tags: []
                  });
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </Button>
            </div>
          </div>
          <div className="p-6 space-y-6">
            {/* Question Type Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                Question Type
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {QUESTION_TYPES.map((type) => {
                  const isSelected = formData.type === type.value;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, type: type.value }))}
                      className={`group p-4 border-2 rounded-xl text-left transition-all duration-200 hover:shadow-md ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-lg transition-colors ${
                          isSelected 
                            ? 'bg-blue-100 dark:bg-blue-800' 
                            : 'bg-gray-100 dark:bg-gray-700 group-hover:bg-gray-200 dark:group-hover:bg-gray-600'
                        }`}>
                          {React.createElement(type.icon, { 
                            className: `h-4 w-4 ${
                              isSelected ? 'text-blue-600' : 'text-gray-600 dark:text-gray-400'
                            }` 
                          })}
                        </div>
                        <div className="flex-1">
                          <div className={`text-sm font-semibold ${
                            isSelected ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-white'
                          }`}>
                            {type.label}
                          </div>
                          <div className={`text-xs ${
                            isSelected ? 'text-blue-600 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400'
                          }`}>
                            {type.category}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Basic Information */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Question Title */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Question Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200"
                  placeholder="Enter a clear, concise question title"
                  required
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200"
                >
                  <option value="Basic">Basic</option>
                  <option value="Contact">Contact</option>
                  <option value="Rating">Rating</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Tags
                </label>
                <input
                  type="text"
                  value={formData.tags?.join(', ') || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag) }))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200"
                  placeholder="Enter tags separated by commas"
                />
              </div>
            </div>

            {/* Question Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200 resize-none"
                placeholder="Provide additional context or instructions for this question"
                rows={3}
              />
            </div>

            {/* Question-specific fields */}
            {(formData.type === 'multipleChoice' || formData.type === 'checkbox') && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <CheckSquare className="h-4 w-4" />
                  Options
                </label>
                <div className="space-y-3">
                  {formData.options?.map((option, index) => (
                    <div key={index} className="flex gap-3 items-center">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-xs font-medium text-blue-600 dark:text-blue-400">
                        {index + 1}
                      </div>
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200"
                        placeholder={`Enter option ${index + 1}`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeOption(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 p-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addOption}
                    className="w-full mt-3 border-dashed border-2 border-blue-300 dark:border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 py-3"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Option
                  </Button>
                </div>
              </div>
            )}

            {(formData.type === 'rating' || formData.type === 'scale') && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  {formData.type === 'rating' ? 'Rating Scale' : 'Scale Range'}
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                      Min Value
                    </label>
                    <input
                      type="number"
                      value={formData.minValue || 1}
                      onChange={(e) => setFormData(prev => ({ ...prev, minValue: parseInt(e.target.value) }))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200"
                      placeholder="1"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                      Max Value *
                    </label>
                    <input
                      type="number"
                      value={formData.maxValue || 5}
                      onChange={(e) => setFormData(prev => ({ ...prev, maxValue: parseInt(e.target.value) }))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200"
                      placeholder="5"
                      min="2"
                    />
                  </div>
                </div>
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                    <Star className="h-4 w-4" />
                    Preview: {formData.minValue || 1} to {formData.maxValue || 5} scale
                  </div>
                </div>
              </div>
            )}

            {(formData.type === 'text' || formData.type === 'textarea' || formData.type === 'email' || formData.type === 'phone') && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  Placeholder Text
                </label>
                <input
                  type="text"
                  value={formData.placeholder || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, placeholder: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200"
                  placeholder="Enter helpful placeholder text for users"
                />
              </div>
            )}

            {/* Required Toggle */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <ToggleLeft className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Required Field
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Users must answer this question to proceed
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.required}
                    onChange={(e) => setFormData(prev => ({ ...prev, required: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingQuestion(null);
                  setFormData({
                    type: 'text',
                    title: '',
                    description: '',
                    required: false,
                    options: [],
                    category: 'Basic',
                    tags: []
                  });
                }}
                className="flex-1 py-3 text-gray-600 hover:text-gray-700 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={editingQuestion ? handleUpdateQuestion : handleAddQuestion}
                disabled={!validateForm()}
                className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-blue-600 disabled:hover:to-blue-700 transition-all duration-200 flex items-center justify-center gap-2"
              >
                {editingQuestion ? (
                  <>
                    <Save className="h-4 w-4" />
                    Update Question
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Add Question
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Question Preview Modal */}
      {previewQuestion && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Eye className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Question Preview
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviewQuestion(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2"
                >
                  ✕
                </Button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {(() => {
                const question = localQuestions.find(q => {
                  const id = '_id' in q ? q._id : `${q.title}-${localQuestions.indexOf(q)}`;
                  return id === previewQuestion;
                });
                if (!question) return null;
                
                return (
                  <>
                    {/* Question Info */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            {question.title}
                            {question.required && (
                              <span className="text-red-500 ml-1">*</span>
                            )}
                          </h4>
                          {question.description && (
                            <p className="text-gray-600 dark:text-gray-400 mb-3">
                              {question.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                            {QUESTION_TYPES.find(t => t.value === question.type)?.category || 'Basic'}
                          </span>
                          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-full">
                            {QUESTION_TYPES.find(t => t.value === question.type)?.label}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Interactive Preview */}
                    <div className="bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6">
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Interactive Preview
                      </div>
                      
                      {question.type === 'text' && (
                        <input
                          type="text"
                          placeholder={question.placeholder || 'Your answer...'}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          disabled
                        />
                      )}
                      
                      {(question as any).type === 'textarea' && (
                        <textarea
                          placeholder={question.placeholder || 'Your detailed answer...'}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none"
                          rows={4}
                          disabled
                        />
                      )}
                      
                      {question.type === 'multipleChoice' && (
                        <div className="space-y-3">
                          {question.options?.map((option, index) => (
                            <label key={index} className="flex items-center p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                              <input
                                type="radio"
                                name="preview"
                                className="mr-3 text-blue-600"
                                disabled
                              />
                              <span className="text-gray-700 dark:text-gray-300">
                                {option}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                      
                      {question.type === 'rating' && (
                        <div className="flex gap-2 justify-center">
                          {Array.from({ length: question.maxValue || 5 }, (_, i) => (
                            <button
                              key={i}
                              className="w-12 h-12 border-2 border-gray-300 dark:border-gray-600 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-400 transition-all duration-200 flex items-center justify-center font-semibold text-gray-700 dark:text-gray-300"
                              disabled
                            >
                              {i + 1}
                            </button>
                          ))}
                        </div>
                      )}
                      
                      {question.type === 'yesNo' && (
                        <div className="flex gap-4 justify-center">
                          <button className="px-6 py-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg font-semibold" disabled>
                            Yes
                          </button>
                          <button className="px-6 py-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg font-semibold" disabled>
                            No
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Template Manager Modal */}
      {showTemplateManager && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Question Templates
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTemplateManager(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2"
                >
                  ✕
                </Button>
              </div>
            </div>
            <div className="p-6">
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Template Manager Coming Soon
                </h4>
                <p className="text-gray-600 dark:text-gray-400">
                  Save and reuse question templates for faster form building.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}