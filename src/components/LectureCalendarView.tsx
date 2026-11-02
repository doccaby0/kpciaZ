import React, { useState, useMemo } from 'react';
import { LectureRequest, UserProfile, InstructorTier } from '../types';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  MapPin, 
  Users, 
  Building, 
  Coins, 
  Lock, 
  CheckCircle, 
  AlertCircle, 
  Sparkles, 
  ArrowRight,
  CalendarDays,
  Filter
} from 'lucide-react';

interface LectureCalendarViewProps {
  lectures: LectureRequest[];
  allLectures: LectureRequest[];
  currentUser: UserProfile | null;
  onSelectLecture: (lecture: LectureRequest) => void;
  getTierRank: (tier?: InstructorTier | string | null) => number;
  filterStatus: 'all' | 'open' | 'assigned' | 'completed';
  onFilterStatusChange: (status: 'all' | 'open' | 'assigned' | 'completed') => void;
}

export const LectureCalendarView: React.FC<LectureCalendarViewProps> = ({
  lectures,
  allLectures,
  currentUser,
  onSelectLecture,
  getTierRank,
  filterStatus,
  onFilterStatusChange
}) => {
  // Determine initial year and month (prefer current date or most recent lecture)
  const initialDate = useMemo(() => {
    const today = new Date();
    // If today is in valid year, use today; otherwise find latest lecture date
    return {
      year: today.getFullYear(),
      month: today.getMonth() // 0-indexed
    };
  }, []);

  const [currentYear, setCurrentYear] = useState<number>(initialDate.year);
  const [currentMonth, setCurrentMonth] = useState<number>(initialDate.month);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Available years from lectures for the year dropdown
  const availableYears = useMemo(() => {
    const yearSet = new Set<number>();
    allLectures.forEach(l => {
      if (l.date && typeof l.date === 'string') {
        const y = parseInt(l.date.split('-')[0], 10);
        if (!isNaN(y) && y >= 2020 && y <= 2030) {
          yearSet.add(y);
        }
      }
    });
    yearSet.add(initialDate.year);
    yearSet.add(2026);
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [allLectures, initialDate.year]);

  // Map of lectures by date string "YYYY-MM-DD"
  const lecturesByDate = useMemo(() => {
    const map = new Map<string, LectureRequest[]>();
    lectures.forEach(l => {
      if (l.date && typeof l.date === 'string') {
        const key = l.date.trim();
        if (!map.has(key)) {
          map.set(key, []);
        }
        map.get(key)!.push(l);
      }
    });
    return map;
  }, [lectures]);

  // Monthly statistics for the currently viewed month
  const monthStats = useMemo(() => {
    const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const monthlyList = allLectures.filter(l => l.date && typeof l.date === 'string' && l.date.startsWith(monthPrefix));
    
    return {
      total: monthlyList.length,
      open: monthlyList.filter(l => l.status === 'open').length,
      assigned: monthlyList.filter(l => l.status === 'assigned').length,
      completed: monthlyList.filter(l => l.status === 'completed').length,
    };
  }, [allLectures, currentYear, currentMonth]);

  // Calendar matrix calculation
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const days: {
      dayNumber: number;
      dateStr: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      dayOfWeek: number;
    }[] = [];

    const todayStr = new Date().toISOString().substring(0, 10);

    // Previous month padding days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({
        dayNumber: dayNum,
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        dayOfWeek: (firstDayIndex - 1 - i) % 7
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayOfWeek = new Date(currentYear, currentMonth, day).getDay();
      days.push({
        dayNumber: day,
        dateStr,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        dayOfWeek
      });
    }

    // Next month padding days to complete 35 or 42 grid cells
    const totalCells = days.length > 35 ? 42 : 35;
    const remaining = totalCells - days.length;
    for (let day = 1; day <= remaining; day++) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayOfWeek = (days.length) % 7;
      days.push({
        dayNumber: day,
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        dayOfWeek
      });
    }

    return days;
  }, [currentYear, currentMonth]);

  // Navigation handlers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDate(today.toISOString().substring(0, 10));
  };

  // Lectures for the currently selected date (or defaults to first day with lectures in current month)
  const activeSelectedDate = useMemo(() => {
    if (selectedDate) return selectedDate;
    // Find the first date in this month that has lectures
    const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    for (const [date, list] of lecturesByDate.entries()) {
      if (date.startsWith(monthPrefix) && list.length > 0) {
        return date;
      }
    }
    // Otherwise fallback to today or 1st of month
    const todayStr = new Date().toISOString().substring(0, 10);
    if (todayStr.startsWith(monthPrefix)) return todayStr;
    return `${monthPrefix}-01`;
  }, [selectedDate, currentYear, currentMonth, lecturesByDate]);

  const selectedDateLectures = useMemo(() => {
    if (!activeSelectedDate) return [];
    return lecturesByDate.get(activeSelectedDate) || [];
  }, [activeSelectedDate, lecturesByDate]);

  const isAdmin = Boolean(currentUser?.isAdmin);
  const userRank = currentUser ? getTierRank(currentUser.tier) : 0;

  // Day of week labels in Korean
  const weekDays = [
    { label: '일', isWeekend: true, color: 'text-red-400' },
    { label: '월', isWeekend: false, color: 'text-neutral-300' },
    { label: '화', isWeekend: false, color: 'text-neutral-300' },
    { label: '수', isWeekend: false, color: 'text-neutral-300' },
    { label: '목', isWeekend: false, color: 'text-neutral-300' },
    { label: '금', isWeekend: false, color: 'text-neutral-300' },
    { label: '토', isWeekend: true, color: 'text-blue-400' }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Calendar Header & Month Switcher */}
      <div className="bg-[#111115] border border-neutral-850 p-4 md:p-5 rounded-2xl shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Month Navigation & Title */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[#D4AF37]">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <span>{currentYear}년</span>
                  <span className="text-[#D4AF37]">{currentMonth + 1}월</span>
                  <span className="text-xs font-medium text-neutral-400">출강 스케줄 캘린더</span>
                </h3>
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                날짜별 출강 매칭 공고 및 일정을 한눈에 확인하고 바로 지원할 수 있습니다.
              </p>
            </div>
          </div>

          {/* Quick Selectors & Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Prev / Today / Next Buttons */}
            <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800 transition-all cursor-pointer"
                title="이전 달로 이동"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleToday}
                className="px-2.5 py-1 text-xs font-bold text-amber-300 hover:text-amber-200 hover:bg-amber-500/10 rounded-lg transition-all cursor-pointer"
                title="오늘 날짜로 이동"
              >
                오늘
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800 transition-all cursor-pointer"
                title="다음 달로 이동"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Direct Year Dropdown */}
            <select
              value={currentYear}
              onChange={(e) => setCurrentYear(Number(e.target.value))}
              className="bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs font-bold px-2.5 py-2 rounded-xl focus:outline-none focus:border-[#D4AF37] cursor-pointer"
            >
              {availableYears.map(y => (
                <option key={y} value={y}>{y}년</option>
              ))}
            </select>

            {/* Direct Month Dropdown */}
            <select
              value={currentMonth}
              onChange={(e) => setCurrentMonth(Number(e.target.value))}
              className="bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs font-bold px-2.5 py-2 rounded-xl focus:outline-none focus:border-[#D4AF37] cursor-pointer"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i}>{i + 1}월</option>
              ))}
            </select>
          </div>
        </div>

        {/* Monthly Summary & Legend Bar */}
        <div className="pt-3 border-t border-neutral-850/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Quick Filter Pill Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10.5px] text-neutral-400 font-bold flex items-center gap-1 mr-1">
              <Filter className="w-3 h-3 text-[#D4AF37]" />
              <span>상태별 필터:</span>
            </span>
            <button
              type="button"
              onClick={() => onFilterStatusChange('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                filterStatus === 'all'
                  ? 'bg-neutral-800 text-white border border-neutral-700 shadow-sm'
                  : 'text-neutral-400 hover:text-white bg-neutral-950/60 border border-neutral-850'
              }`}
            >
              전체 ({monthStats.total}건)
            </button>
            <button
              type="button"
              onClick={() => onFilterStatusChange('open')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                filterStatus === 'open'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-amber-400/70 hover:text-amber-300 bg-amber-500/5 border border-amber-500/15'
              }`}
            >
              <span>🔥 모집중</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9.5px] bg-amber-500/30 text-amber-300 font-mono">
                {monthStats.open}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onFilterStatusChange('assigned')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                filterStatus === 'assigned'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm'
                  : 'text-blue-400/70 hover:text-blue-300 bg-blue-500/5 border border-blue-500/15'
              }`}
            >
              <span>🤝 배정완료</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9.5px] bg-blue-500/30 text-blue-300 font-mono">
                {monthStats.assigned}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onFilterStatusChange('completed')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                filterStatus === 'completed'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-emerald-400/70 hover:text-emerald-300 bg-emerald-500/5 border border-emerald-500/15'
              }`}
            >
              <span>✓ 출강완료</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9.5px] bg-emerald-500/30 text-emerald-300 font-mono">
                {monthStats.completed}
              </span>
            </button>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 text-[10px] text-neutral-400 select-none">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block shadow-sm shadow-amber-400/40"></span>
              신규 모집
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-400 inline-block shadow-sm shadow-blue-400/40"></span>
              배정 완료
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block shadow-sm shadow-emerald-400/40"></span>
              정산 완료
            </span>
          </div>
        </div>
      </div>

      {/* Monthly Calendar Grid Container */}
      <div className="bg-[#0e0e12] border border-neutral-850 rounded-2xl overflow-hidden shadow-2xl">
        {/* Day-of-Week Table Header */}
        <div className="grid grid-cols-7 border-b border-neutral-850 bg-neutral-950/70 text-center py-2.5">
          {weekDays.map((wd, idx) => (
            <div key={idx} className={`text-xs font-black tracking-wider ${wd.color}`}>
              {wd.label}
            </div>
          ))}
        </div>

        {/* Calendar Day Grid */}
        <div className="grid grid-cols-7 divide-x divide-y divide-neutral-850/60 bg-[#0e0e12]">
          {calendarDays.map((cell) => {
            const dayLectures = lecturesByDate.get(cell.dateStr) || [];
            const hasLectures = dayLectures.length > 0;
            const isSelected = activeSelectedDate === cell.dateStr;

            return (
              <div
                key={cell.dateStr}
                onClick={() => setSelectedDate(cell.dateStr)}
                className={`min-h-[92px] sm:min-h-[115px] lg:min-h-[130px] p-1.5 sm:p-2 transition-all relative flex flex-col justify-between cursor-pointer group ${
                  !cell.isCurrentMonth
                    ? 'bg-neutral-950/40 opacity-45'
                    : isSelected
                      ? 'bg-amber-500/[0.08] ring-1 ring-[#D4AF37] z-10'
                      : 'hover:bg-neutral-900/60'
                }`}
              >
                {/* Date header row inside cell */}
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span
                    className={`text-xs font-extrabold flex items-center justify-center transition-all ${
                      cell.isToday
                        ? 'bg-gradient-to-r from-[#D4AF37] to-amber-500 text-neutral-950 w-6 h-6 rounded-full font-black shadow-md shadow-amber-500/20'
                        : isSelected
                          ? 'text-[#D4AF37] font-black'
                          : cell.dayOfWeek === 0
                            ? 'text-red-400/90'
                            : cell.dayOfWeek === 6
                              ? 'text-blue-400/90'
                              : 'text-neutral-300'
                    }`}
                  >
                    {cell.dayNumber}
                  </span>

                  {/* Lecture Count Indicator Badge */}
                  {hasLectures && (
                    <span 
                      className={`text-[9px] font-black px-1.5 py-0.2 rounded-full border transition-all ${
                        isSelected 
                          ? 'bg-amber-500/30 text-amber-200 border-amber-500/50' 
                          : 'bg-neutral-900 text-neutral-400 border-neutral-800 group-hover:border-neutral-700'
                      }`}
                      title={`${cell.dateStr}: ${dayLectures.length}건의 출강 일정`}
                    >
                      {dayLectures.length}건
                    </span>
                  )}
                </div>

                {/* Lecture chips container */}
                <div className="space-y-1 overflow-hidden flex-1 flex flex-col justify-start">
                  {dayLectures.slice(0, 3).map((lec) => {
                    const targetRank = getTierRank(lec.targetTier);
                    const isRestricted = !isAdmin && (userRank < targetRank);

                    // Styling based on lecture status
                    let statusColor = 'bg-amber-500/15 border-amber-500/30 text-amber-300 hover:bg-amber-500/25';
                    let statusDot = 'bg-amber-400';
                    if (lec.status === 'assigned') {
                      statusColor = 'bg-blue-500/15 border-blue-500/30 text-blue-300 hover:bg-blue-500/25';
                      statusDot = 'bg-blue-400';
                    } else if (lec.status === 'completed') {
                      statusColor = 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25';
                      statusDot = 'bg-emerald-400';
                    }

                    const categoryTag = lec.lectureCategory === 'internal' ? '🏛️자체' : '🏢파견';
                    const instructorTag = lec.assignedName ? `·👤${lec.assignedName}` : '';
                    const displayTitle = isRestricted 
                      ? `🔒 [${lec.companyName || '의뢰처'}] 등급 제한 공고`
                      : `[${categoryTag}] ${lec.companyName || '출강'} ${lec.title}${instructorTag}`;

                    return (
                      <button
                        key={lec.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectLecture(lec);
                        }}
                        className={`w-full text-left px-1.5 py-0.5 rounded border text-[9px] sm:text-[10px] font-medium truncate transition-all cursor-pointer flex items-center gap-1 ${statusColor} shadow-xs hover:scale-[1.01]`}
                        title={`[${lec.date}] ${lec.companyName || ''} - ${lec.title} (${lec.time || ''}) 클릭하여 상세 보기`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${statusDot} shrink-0`}></span>
                        <span className="truncate">{displayTitle}</span>
                      </button>
                    );
                  })}

                  {/* Overcount pill */}
                  {dayLectures.length > 3 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDate(cell.dateStr);
                      }}
                      className="w-full text-left px-1.5 py-0.5 text-[8.5px] font-bold text-neutral-400 hover:text-amber-300 bg-neutral-900/80 rounded border border-neutral-800 transition-colors"
                    >
                      + {dayLectures.length - 3}건 더보기
                    </button>
                  )}
                </div>

                {/* Subdued footer indicator on hover/select */}
                <div className="h-0.5 mt-1 rounded-full transition-all">
                  {isSelected && (
                    <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent"></div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Date Detail Drawer / Schedule List */}
      <div className="bg-[#111115] border border-neutral-850 p-4 md:p-6 rounded-2xl shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-850 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[#D4AF37]">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm md:text-base font-black text-white flex items-center gap-2">
                <span>📅 {activeSelectedDate}</span>
                <span className="text-[#D4AF37]">출강 상세 스케줄</span>
                <span className="text-xs font-bold text-neutral-400">
                  (총 {selectedDateLectures.length}건)
                </span>
              </h4>
              <p className="text-[11px] text-neutral-400">
                선택하신 날짜의 전체 출강 요청서 및 매칭 현황 목록입니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedDateLectures.length > 0 && (
              <span className="text-[11px] text-neutral-500">
                공고 카드를 클릭하면 전체 상세 정보 및 지원/서약서를 열람할 수 있습니다.
              </span>
            )}
          </div>
        </div>

        {/* Selected Day Lecture Items */}
        {selectedDateLectures.length === 0 ? (
          <div className="py-10 text-center space-y-2 bg-neutral-950/40 rounded-xl border border-neutral-850/60">
            <CalendarIcon className="w-8 h-8 text-neutral-600 mx-auto" />
            <p className="text-xs font-bold text-neutral-300">
              {activeSelectedDate}에 예정된 출강 일정이 없습니다.
            </p>
            <p className="text-[11px] text-neutral-500">
              달력에서 일정이 표시된 다른 날짜를 선택하거나, 월 이동 버튼을 통해 일정을 확인해 보세요.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {selectedDateLectures.map((lec) => {
              const targetRank = getTierRank(lec.targetTier);
              const isRestricted = !isAdmin && (userRank < targetRank);
              const hasApplied = currentUser && (lec.applicants || []).includes(currentUser.uid);

              return (
                <div
                  key={lec.id}
                  onClick={() => onSelectLecture(lec)}
                  className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-3 group text-left ${
                    isRestricted
                      ? 'bg-neutral-950/80 border-neutral-900 hover:border-amber-500/40 hover:bg-neutral-900/60'
                      : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900 hover:shadow-lg'
                  }`}
                >
                  <div className="space-y-2">
                    {/* Top Status & Tier */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Category Badge */}
                        <span className={`text-[9.5px] font-black px-2 py-0.5 rounded border ${
                          lec.lectureCategory === 'internal'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                        }`}>
                          {lec.lectureCategory === 'internal' ? '🏛️ 자체강의' : '🏢 파견강의'}
                        </span>

                        {lec.status === 'open' && (
                          <span className="text-[9.5px] font-black px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                            <span>🔥 모집중</span>
                          </span>
                        )}
                        {lec.status === 'assigned' && (
                          <span className="text-[9.5px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            🤝 배정 완료
                          </span>
                        )}
                        {lec.status === 'completed' && (
                          <span className="text-[9.5px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            ✓ 출강 정산 완료
                          </span>
                        )}

                        <span className="text-[9.5px] font-bold text-neutral-400 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-850">
                          {lec.targetTier}
                        </span>

                        {lec.assignedName && (
                          <span className="text-[9.5px] font-bold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                            👤 {lec.assignedName}{lec.assignedTo === 'external' ? ' (외부)' : ''}
                          </span>
                        )}
                      </div>

                      {hasApplied && (
                        <span className="text-[9px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                          지원 완료
                        </span>
                      )}
                    </div>

                    {/* Company & Title */}
                    <div>
                      <div className="text-[11px] font-extrabold text-neutral-300 flex items-center gap-1.5">
                        <Building className="w-3 h-3 text-[#D4AF37]" />
                        <span>{lec.companyName || '익명 의뢰 기업'}</span>
                        {lec.partnerCompany && (
                          <span className="text-[9px] text-[#D4AF37] border border-[#D4AF37]/30 bg-[#D4AF37]/5 px-1 rounded font-bold">
                            {lec.partnerCompany}
                          </span>
                        )}
                      </div>
                      <h5 className="text-xs md:text-sm font-black text-white mt-1 group-hover:text-[#D4AF37] transition-colors line-clamp-2">
                        {isRestricted ? '🔒 [등급 보호] 비공개 교육과정' : lec.title}
                      </h5>
                    </div>

                    {/* Meta info: Time, Duration, Location */}
                    <div className="space-y-1 text-[10.5px] text-neutral-400 pt-1 border-t border-neutral-850/60 font-mono">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-neutral-500 shrink-0" />
                        <span>{lec.time || '시간 협의'} ({lec.duration || '일정 확인'})</span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3 h-3 text-neutral-500 shrink-0" />
                        <span className="truncate">{lec.location || '출강 장소 협의'}</span>
                      </div>
                      {lec.attendees && (
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3 h-3 text-neutral-500 shrink-0" />
                          <span>예정 인원: {lec.attendees}명</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Budget & Action CTA */}
                  <div className="pt-2 border-t border-neutral-850/60 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 text-[11px] font-bold text-neutral-300">
                      <Coins className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>
                        {isRestricted ? '🔒 등급 비공개' : `${(lec.budget || 0).toLocaleString()}원`}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectLecture(lec);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-[#D4AF37] text-neutral-300 hover:text-neutral-950 font-bold text-[10px] transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <span>상세보기</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
