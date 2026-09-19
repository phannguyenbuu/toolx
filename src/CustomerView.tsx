import React, { useState, useEffect } from 'react';
import { ElementData, PageConfig } from './App';
import { renderElement, shouldElementBeVisible } from './utils/elementRenderer';
import { ChevronLeft, ChevronRight, Lock, Eye, EyeOff, Save, X, CheckCircle } from 'lucide-react';

interface CustomerViewProps {
    elements: ElementData[];
    pageConfig: PageConfig;
    dataRows: Record<string, string>[];
    headers: string[];
    settings: { active: boolean; pin: string; allowEdit?: boolean };
    initialNotes: Record<number, string>;
    onClose: () => void;
    onSaveNote: (rowIndex: number, note: string) => void;
    onUpdateRow?: (rowIndex: number, key: string, value: string) => void;
    resolveContent: (content: string, row?: Record<string, string>) => string;
    resolveImageSrc: (el: ElementData, row?: Record<string, string>) => string;
    mmToPx: (mm: number) => number;
}

export const CustomerView: React.FC<CustomerViewProps> = ({
    elements,
    pageConfig,
    dataRows,
    headers,
    settings,
    initialNotes,
    onClose,
    onSaveNote,
    onUpdateRow,
    resolveContent,
    resolveImageSrc,
    mmToPx
}) => {
    const [isAuthenticated, setIsAuthenticated] = useState(!settings.pin); // Nếu không có PIN thì vào luôn
    const [pinInput, setPinInput] = useState('');
    const [error, setError] = useState('');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [notes, setNotes] = useState(initialNotes);
    const [showPin, setShowPin] = useState(false);

    // Zoom cho phần preview để vừa màn hình
    const [previewScale, setPreviewScale] = useState(1);

    useEffect(() => {
        // Auto fit preview
        const containerH = window.innerHeight - 100; // trừ header/padding
        const containerW = (window.innerWidth * 0.6) - 40; // 60% width
        const pageH = mmToPx(pageConfig.height);
        const pageW = mmToPx(pageConfig.width);
        
        const scale = Math.min(containerW / pageW, containerH / pageH, 1.5); // Max scale 1.5
        setPreviewScale(scale);
    }, [pageConfig, mmToPx]);

    const handleLogin = () => {
        if (pinInput === settings.pin) {
            setIsAuthenticated(true);
            setError('');
        } else {
            setError('Mã PIN không đúng');
        }
    };

    const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newNote = e.target.value;
        setNotes(prev => ({ ...prev, [currentIndex]: newNote }));
        onSaveNote(currentIndex, newNote);
    };

    if (!settings.active) {
        return (
            <div className="fixed inset-0 bg-gray-100 z-[100] flex flex-col items-center justify-center">
                <div className="bg-white p-8 rounded-lg shadow-xl text-center max-w-md">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <X size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Liên kết không khả dụng</h2>
                    <p className="text-gray-600 mb-6">Chế độ xem trước hiện đang bị tắt bởi người thiết kế.</p>
                    <button onClick={onClose} className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900">Quay lại</button>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="fixed inset-0 bg-gray-900 z-[100] flex flex-col items-center justify-center">
                <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-sm">
                    <div className="text-center mb-6">
                        <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Lock size={24} />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800">Yêu cầu truy cập</h2>
                        <p className="text-sm text-gray-500">Vui lòng nhập mã PIN để xem thiết kế</p>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="relative">
                            <input 
                                type={showPin ? "text" : "password"}
                                value={pinInput}
                                onChange={(e) => setPinInput(e.target.value)}
                                placeholder="Nhập mã PIN"
                                className="w-full px-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                            />
                            <button 
                                onClick={() => setShowPin(!showPin)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showPin ? <EyeOff size={20}/> : <Eye size={20}/>}
                            </button>
                        </div>
                        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                        <button 
                            onClick={handleLogin}
                            className="w-full py-3 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700 transition-colors"
                        >
                            Đăng nhập
                        </button>
                        <button onClick={onClose} className="w-full py-2 text-gray-500 text-sm hover:text-gray-700">Quay lại</button>
                    </div>
                </div>
            </div>
        );
    }

    const currentRow = dataRows.length > 0 ? dataRows[currentIndex] : undefined;

    return (
        <div className="fixed inset-0 bg-gray-50 z-[100] flex flex-col">
            {/* Header */}
            <div className="h-14 bg-white border-b px-6 flex items-center justify-between shadow-sm shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-white font-bold">P</div>
                    <h1 className="font-bold text-gray-800">Preview Mode</h1>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1">
                         <button 
                            disabled={currentIndex === 0 || dataRows.length === 0} 
                            onClick={() => setCurrentIndex(p => p - 1)} 
                            className="p-1.5 hover:bg-white rounded disabled:opacity-30 shadow-sm transition-all"
                        ><ChevronLeft size={20}/></button>
                         
                         <div className="flex items-center bg-white rounded border px-1">
                            <input 
                                type="number" 
                                min={1} 
                                max={dataRows.length}
                                value={dataRows.length > 0 ? currentIndex + 1 : 0}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    if (!isNaN(val) && val >= 1 && val <= dataRows.length) {
                                        setCurrentIndex(val - 1);
                                    }
                                }}
                                className="w-12 text-center font-mono font-bold text-sm outline-none py-1"
                            />
                            <span className="text-gray-400 text-xs px-1">/ {dataRows.length}</span>
                         </div>

                         <button 
                            disabled={currentIndex === dataRows.length - 1 || dataRows.length === 0} 
                            onClick={() => setCurrentIndex(p => p + 1)} 
                            className="p-1.5 hover:bg-white rounded disabled:opacity-30 shadow-sm transition-all"
                        ><ChevronRight size={20}/></button>
                    </div>
                    <div className="h-6 w-px bg-gray-300"/>
                    <button onClick={onClose} className="px-4 py-2 border rounded hover:bg-gray-50 text-sm font-medium">
                        Đóng Viewer
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Left: Data & Notes */}
                <div className="w-[40%] bg-white border-r flex flex-col max-w-md shadow-lg z-10">
                    <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                        <h3 className="font-bold text-gray-700 flex items-center gap-2">
                            <CheckCircle size={16} className="text-emerald-600"/> 
                            Dữ liệu & Ghi chú
                        </h3>
                        <div className="text-xs text-gray-500 font-mono">
                            Row: {currentIndex + 1}
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-0 bg-gray-50/50">
                        {/* Data Table - Vertical View */}
                        <div className="p-4 space-y-6">
                            <div>
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 px-1">Thông tin bản ghi</h4>
                                <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                                    <table className="w-full text-sm">
                                        <tbody>
                                            {currentRow && headers.map((header, idx) => (
                                                <tr key={header} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                                                    <td className="w-1/3 bg-gray-50/80 p-3 font-medium text-gray-600 border-r truncate align-middle" title={header}>
                                                        {header}
                                                    </td>
                                                    <td className="w-2/3 p-0 relative">
                                                        {settings.allowEdit && onUpdateRow ? (
                                                            <input 
                                                                className="w-full h-full p-3 bg-transparent outline-none focus:bg-blue-50/50 text-gray-800 font-medium transition-all placeholder-gray-300"
                                                                value={currentRow[header] || ''}
                                                                onChange={(e) => onUpdateRow(currentIndex, header, e.target.value)}
                                                                placeholder="Nhập dữ liệu..."
                                                            />
                                                        ) : (
                                                            <div className="p-3 text-gray-800 font-medium break-words" title={currentRow[header]}>
                                                                {currentRow[header]}
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                            {!currentRow && (
                                                <tr>
                                                    <td colSpan={2} className="p-8 text-center text-gray-400 italic">
                                                        Chưa có dữ liệu nào được chọn
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Notes Section */}
                            <div>
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2 px-1">
                                    Ghi chú <span className="text-[10px] font-normal normal-case text-gray-400 bg-gray-200 px-1.5 rounded-full">Auto-save</span>
                                </h4>
                                <div className="relative">
                                    <textarea 
                                        className="w-full h-32 p-4 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm bg-yellow-50/50 shadow-sm resize-none"
                                        placeholder="Nhập ghi chú cho bản ghi này..."
                                        value={notes[currentIndex] || ''}
                                        onChange={handleNoteChange}
                                    />
                                    <div className="absolute bottom-2 right-2 text-[10px] text-gray-400 pointer-events-none">
                                        {notes[currentIndex]?.length || 0} chars
                                    </div>
                                </div>
                            </div>

                            {/* Full Data List Table */}
                            <div className="pt-4 border-t mt-6">
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 px-1 flex items-center justify-between">
                                    Danh sách dữ liệu ({dataRows.length})
                                </h4>
                                <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
                                    <div className="overflow-x-auto max-h-80">
                                        <table className="w-full text-xs text-left whitespace-nowrap">
                                            <thead className="bg-gray-100 font-bold text-gray-600 sticky top-0 z-10 shadow-sm">
                                                <tr>
                                                    <th className="p-2 border-b w-10 text-center bg-gray-100">#</th>
                                                    {headers.map(h => <th key={h} className="p-2 border-b bg-gray-100">{h}</th>)}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {dataRows.map((row, idx) => (
                                                    <tr 
                                                        key={idx} 
                                                        onClick={() => setCurrentIndex(idx)}
                                                        className={`cursor-pointer transition-colors border-b last:border-0 ${currentIndex === idx ? 'bg-indigo-100 text-indigo-700 font-medium' : 'hover:bg-gray-50'}`}
                                                    >
                                                        <td className="p-2 border-r text-center text-gray-400">{idx + 1}</td>
                                                        {headers.map(h => (
                                                            <td key={h} className="p-2 border-r last:border-0 max-w-[150px] truncate">
                                                                {row[h]}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                                {dataRows.length === 0 && (
                                                    <tr>
                                                        <td colSpan={headers.length + 1} className="p-4 text-center text-gray-400">Trống</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Preview */}
                <div className="flex-1 bg-gray-200 flex items-center justify-center overflow-hidden relative p-8">
                    <div className="absolute inset-0 pointer-events-none opacity-5" 
                        style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}
                    />
                    
                    <div 
                        className="bg-white shadow-2xl transition-transform duration-300 ease-out"
                        style={{ 
                            width: `${mmToPx(pageConfig.width)}px`, 
                            height: `${mmToPx(pageConfig.height)}px`,
                            transform: `scale(${previewScale})`,
                            transformOrigin: 'center',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                    >
                         {elements
                            .filter(el => shouldElementBeVisible(el, 'preview'))
                            .map(el => renderElement(el, {
                                mmToPx,
                                resolveContent: (content, row) => content.replace(/{([^{}]+)}/g, (_, key) => row?.[key] || _),
                                resolveImageSrc,
                                rowData: currentRow,
                                isExport: false
                            }))}
                    </div>
                </div>
            </div>
        </div>
    );
};
