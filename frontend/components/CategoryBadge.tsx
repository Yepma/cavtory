import React from 'react';
import { Category } from '../types';

const categoryStyles: Record<Category, string> = {
  [Category.Cooking]: 'bg-orange-950/30 text-orange-400 border-orange-900/50',
  [Category.HomeCleaning]: 'bg-blue-950/30 text-blue-400 border-blue-900/50',
  [Category.PersonalCare]: 'bg-pink-950/30 text-pink-400 border-pink-900/50',
  [Category.Botiquin]: 'bg-emerald-950/30 text-emerald-400 border-emerald-900/50'
};

export const CategoryBadge: React.FC<{ category: Category }> = ({ category }) => (
  <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-medium tracking-wider border ${categoryStyles[category]}`}>
    {category}
  </span>
);
