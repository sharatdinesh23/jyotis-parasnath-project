'use client';

import React, { useState } from 'react';
import { UserRole, LanguageCode } from '@/types';
import { getTranslation } from '@/lib/translations';
import {
  LayoutDashboard,
  UserPlus,
  ClipboardList,
  Mic,
  FileCheck2,
  FileText,
  Pill,
  ShieldCheck,
  FileDown,
  Users2,
  CalendarClock,
  Sparkles,
  Settings,
  RotateCcw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export type NavItemKey =
  | 'dashboard'
  | 'patients'
  | 'questionnaire'
  | 'voice_assistant'
  | 'case_paper'
  | 'prescription'
  | 'approvals'
  | 'crm'
  | 'followups'
  | 'settings';

interface SidebarProps {
  activeTab: NavItemKey;
  onSelectTab: (tab: NavItemKey) => void;
  currentRole: UserRole;
  currentLanguage: LanguageCode;
  pendingApprovalsCount: number;
  followUpsCount: number;
  onResetDemo: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  currentRole,
  currentLanguage,
  pendingApprovalsCount,
  followUpsCount,
  onResetDemo,
}) => {
  const t = getTranslation(currentLanguage);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems = [
    {
      key: 'dashboard' as NavItemKey,
      label: t.navDashboard,
      icon: LayoutDashboard,
      roles: ['admin', 'doctor', 'receptionist'],
      moduleNum: 12,
    },
    {
      key: 'patients' as NavItemKey,
      label: t.navPatientManagement,
      icon: UserPlus,
      roles: ['receptionist', 'admin', 'doctor'],
      moduleNum: 1,
    },
    {
      key: 'questionnaire' as NavItemKey,
      label: t.navQuestionnaire,
      icon: ClipboardList,
      roles: ['receptionist', 'patient', 'doctor', 'admin'],
      moduleNum: 2,
    },
    {
      key: 'voice_assistant' as NavItemKey,
      label: t.navVoiceAssistant,
      icon: Mic,
      roles: ['doctor', 'admin'],
      moduleNum: 3,
      badge: 'LIVE',
    },
    {
      key: 'approvals' as NavItemKey,
      label: t.navApprovals,
      icon: ShieldCheck,
      roles: ['doctor', 'admin'],
      moduleNum: 8,
      count: pendingApprovalsCount,
      urgent: pendingApprovalsCount > 0,
      highlight: true,
    },
    {
      key: 'case_paper' as NavItemKey,
      label: t.navCasePaper,
      icon: FileText,
      roles: ['doctor', 'admin', 'patient'],
      moduleNum: 6,
    },
    {
      key: 'prescription' as NavItemKey,
      label: t.navPrescription,
      icon: Pill,
      roles: ['doctor', 'admin', 'patient'],
      moduleNum: 7,
    },
    {
      key: 'crm' as NavItemKey,
      label: t.navPatientCRM,
      icon: Users2,
      roles: ['admin', 'doctor', 'receptionist'],
      moduleNum: 10,
    },
    {
      key: 'followups' as NavItemKey,
      label: t.navFollowUps,
      icon: CalendarClock,
      roles: ['receptionist', 'admin', 'doctor'],
      moduleNum: 11,
      count: followUpsCount,
    },
    {
      key: 'settings' as NavItemKey,
      label: t.navSettings,
      icon: Settings,
      roles: ['admin', 'doctor', 'receptionist', 'patient'],
      moduleNum: 0,
    },
  ];

  return (
    <aside
      className={`h-full flex-shrink-0 bg-slate-950 border-r border-slate-800 flex flex-col justify-between overflow-y-auto overflow-x-hidden select-none z-20 transition-all duration-200 ${
        isCollapsed ? 'w-16' : 'w-auto min-w-[190px] max-w-[245px]'
      }`}
    >
      <div className="p-2.5 space-y-1">
        <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between gap-2">
          {!isCollapsed && (
            <span className="whitespace-nowrap truncate">Clinical Modules</span>
          )}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors ml-auto"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {navItems.map((item) => {
          const isAllowed = item.roles.includes(currentRole);
          const isActive = activeTab === item.key;
          const Icon = item.icon;

          return (
            <button
              key={item.key}
              onClick={() => onSelectTab(item.key)}
              disabled={!isAllowed}
              title={item.label}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'justify-between px-2.5'} py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 gap-2 ${
                !isAllowed
                  ? 'opacity-30 cursor-not-allowed text-slate-600'
                  : isActive
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-900/30 font-bold'
                  : item.highlight && item.urgent
                  ? 'bg-amber-950/30 text-amber-200 hover:bg-amber-900/30 border border-amber-600/30'
                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive
                      ? 'text-white'
                      : item.highlight && item.urgent
                      ? 'text-amber-400'
                      : 'text-purple-400'
                  }`}
                />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </div>

              {!isCollapsed && (
                <div className="flex items-center gap-1 shrink-0">
                  {item.count !== undefined && item.count > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isActive
                          ? 'bg-white text-purple-900'
                          : item.urgent
                          ? 'bg-amber-500 text-slate-950 animate-pulse'
                          : 'bg-purple-900 text-purple-300'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                  {item.badge && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-800/40 font-bold">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom helper card for demo */}
      {!isCollapsed ? (
        <div className="p-2.5 border-t border-slate-800/80 space-y-2 bg-slate-900/30">
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300">
            <div className="font-semibold text-white flex items-center gap-1.5 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span className="truncate">Knee-Pain Demo Case</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Ramesh Joshi (62M) is waiting in Approvals queue ready for doctor sign-off.
            </p>
          </div>

          <button
            onClick={onResetDemo}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs border border-slate-800 transition-colors"
            title="Restore initial knee-pain demo consultation"
          >
            <RotateCcw className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Reset Demo Data</span>
          </button>
        </div>
      ) : (
        <div className="p-2 border-t border-slate-800/80 flex justify-center">
          <button
            onClick={onResetDemo}
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
            title="Reset Demo Data"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      )}
    </aside>
  );
};
