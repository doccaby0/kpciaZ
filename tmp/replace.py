with open('src/components/LectureBoard.tsx', 'r') as f:
    lines = f.readlines()

replacement = '''                {/* Absolute Lock Overlay */}
                {isLectBlurred && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 p-4 text-center z-10 pointer-events-auto select-none">
                    <div className="p-3.5 bg-neutral-950/95 border border-neutral-800 rounded-xl flex flex-col items-center gap-2 shadow-2xl max-w-[90%]">
                      <span className="text-[18px] animate-bounce">🔒</span>
                      <span className="text-[11px] font-black text-kpcia-gold tracking-tight">
                        {lecture.targetTier.replace('Prestige ', '')} 이상 출강 가능
                      </span>
                      <span className="text-[9px] text-neutral-400">
                        회원님의 등급({currentUser?.tier?.replace('Prestige ', '') || '비회원'})보다 높은 공고입니다.
                      </span>
                    </div>
                  </div>
                )}

                {/* Card Content Wrapper with Selective Blur Filter */}
                <div className={`flex-1 flex flex-col justify-between h-full space-y-3.5 ${isLectBlurred ? "select-none pointer-events-none" : ""}`}>
                  {/* Card Top Information */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-1">
                      {/* Status Badges */}
                      <div className={`flex items-center space-x-1 shrink-0 ${isLectBlurred ? "blur-[3px] select-none pointer-events-none" : ""}`}>
                        {lecture.status === 'open' && (
                          <span className="text-[9.5px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/20 animate-pulse">
                            신청 접수중
                          </span>
                        )}
                        {lecture.status === 'assigned' && (
                          <span className="text-[9.5px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 font-bold border border-blue-500/20 truncate max-w-[110px]">
                            배정됨 ({lecture.assignedName})
                          </span>
                        )}
                        {lecture.status === 'completed' && (
                          <span className="text-[9.5px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 font-bold border border-neutral-700">
                            출강 종료
                          </span>
                        )}
                      </div>

                      {/* Required Tier Qualification */}
                      <div className="flex items-center">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold border shrink-0 ${tierColors[lecture.targetTier]} ${isLectBlurred ? "blur-[3px] select-none pointer-events-none" : ""}`}>
                          🛡️ {lecture.targetTier.replace('Prestige ', '')} ↑
                        </span>
                      </div>
                    </div>

                    {/* Title & info buttons */}
                    <div className="flex items-start justify-between gap-1.5">
                      <h3 className={`font-display font-bold text-[14px] text-neutral-100 tracking-tight leading-snug hover:text-kpcia-gold transition-colors line-clamp-1 ${isLectBlurred ? "select-none pointer-events-none" : ""}`} title={isLectBlurred ? undefined : lecture.title}>
                        {(() => {
                          const parsed = parseLectureTitle(lecture);
                          return (
                            <>
                              <span className="text-kpcia-gold font-bold mr-1 shrink-0">[{parsed.company}]</span>
                              <span className={isLectBlurred ? "blur-[3.5px] select-none pointer-events-none" : ""}>{parsed.rest}</span>
                            </>
                          );
                        })()}
                      </h3>
                      {!isLectBlurred && (
                        <button
                          type="button"
                          onClick={() => downloadLectureAsExcel(lecture)}
                          className="text-[8.5px] bg-neutral-950 border border-neutral-850 text-neutral-400 hover:text-kpcia-gold hover:border-kpcia-gold/30 px-1.5 py-0.5 rounded shrink-0 font-sans flex items-center gap-0.5 cursor-pointer"
                          title="출강 파견 안내서 엑셀 변환 및 다운로드"
                        >
                          <FileDown className="w-2.5 h-2.5 text-neutral-400" />
                          <span>출강표</span>
                        </button>
                      )}
                    </div>

                    {/* Description with Company Name */}
                    <div className="space-y-1">
                      <div className="text-[10px] flex items-center gap-1.5">
                        <span className="text-[9px] bg-neutral-950 border border-neutral-850 px-1 py-0.2 rounded text-kpcia-gold font-bold">기업/기관명</span>
                        <span className="font-bold text-neutral-200">{getLectureCompany(lecture)}</span>
                      </div>
                      <p className={`text-[10.5px] text-neutral-400 leading-relaxed font-sans line-clamp-2 min-h-[32px] ${isLectBlurred ? "blur-[3px] select-none pointer-events-none" : ""}`} title={isLectBlurred ? undefined : lecture.description}>
                        {lecture.description}
                      </p>
                    </div>
                  </div>
'''

new_lines = lines[:896] + [replacement] + lines[979:]

with open('src/components/LectureBoard.tsx', 'w') as f:
    f.writelines(new_lines)

print('Successfully replaced lines in LectureBoard.tsx!')
