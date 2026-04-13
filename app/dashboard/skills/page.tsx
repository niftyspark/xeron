'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { BUILTIN_SKILLS, SKILL_CATEGORIES } from '@/lib/skills';
import { useSkills } from '@/app/store/useSkills';
import { Switch } from '@/app/components/ui/switch';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/ui/tabs';
import {
  Globe, Code2, Bug, FileText, Languages, Calculator, BarChart3, Database,
  Mail, PenTool, Search, FileCode, TrendingUp, Wallet, Image, FileCode2,
  Network, Table, Regex
} from 'lucide-react';

const iconMap: Record<string, any> = {
  Globe, Code2, Bug, FileText, Languages, Calculator, BarChart3, Database,
  Mail, PenTool, Search, FileCode, TrendingUp, Wallet, Image, FileCode2,
  Network, Table, Regex, Twitter: PenTool,
};

export default function SkillsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const { enabledSkills, toggleSkill } = useSkills();

  const filtered = BUILTIN_SKILLS.filter((skill) => {
    const matchesSearch = skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || skill.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Skills</h1>
          <p className="text-sm text-white/40 mt-1">
            Enable and configure XERON&apos;s capabilities. {enabledSkills.length} active skills.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start gap-4 mb-6">
        <Input
          placeholder="Search skills..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs"
        />
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full sm:w-auto">
          <TabsList className="flex-wrap">
            <TabsTrigger value="all">All</TabsTrigger>
            {SKILL_CATEGORIES.map((cat) => (
              <TabsTrigger key={cat.id} value={cat.id}>
                {cat.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((skill, i) => {
          const Icon = iconMap[skill.icon] || Code2;
          const isEnabled = enabledSkills.includes(skill.id);

          return (
            <motion.div
              key={skill.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group p-5 rounded-2xl glass hover:bg-white/[0.06] transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isEnabled ? 'bg-blue-600/20 border border-blue-500/20' : 'bg-white/5 border border-white/10'} transition-colors`}>
                    <Icon className={`w-5 h-5 ${isEnabled ? 'text-blue-400' : 'text-white/40'}`} />
                  </div>
                  <div>
                    <h3 className="font-medium text-white text-sm">{skill.name}</h3>
                    <Badge variant={isEnabled ? 'default' : 'secondary'} className="mt-1">
                      {skill.category}
                    </Badge>
                  </div>
                </div>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={() => toggleSkill(skill.id)}
                />
              </div>
              <p className="text-xs text-white/40 leading-relaxed">{skill.description}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
