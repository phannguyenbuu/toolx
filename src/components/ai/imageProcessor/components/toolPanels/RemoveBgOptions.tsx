import React from 'react';
import { Layers, Loader2 } from 'lucide-react';

interface RemoveBgOptionsProps {
  imageDimensions: { width: number; height: number } | null;
  processRemoveBg: () => void;
  isProcessing: boolean;
  image: string | null;
}

export const RemoveBgOptions: React.FC<RemoveBgOptionsProps> = ({
  imageDimensions,
  processRemoveBg,
  isProcessing,
  image
}) => {
  return (
    <div className="space-y-4">
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <h4 className="font-bold text-green-800 flex items-center gap-2">
          <Layers size={18} />
          Xóa nền ảnh
        </h4>
        <p className="text-sm text-green-600 mt-1">
          Tự động nhận diện và xóa nền ảnh, giữ lại đối tượng chính.
        </p>
      </div>

      {imageDimensions && (
        <div className="bg-gray-50 rounded-lg p-3 text-sm">
          <p className="text-gray-600">
            Kích thước:{' '}
            <span className="font-bold">
              {imageDimensions.width} × {imageDimensions.height}px
            </span>
          </p>
        </div>
      )}

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
        <p className="text-sm text-yellow-700">
          <strong>Lưu ý:</strong> Tính năng này sử dụng API remove.bg hoặc model AI local.
          Kết quả tốt nhất với ảnh có đối tượng rõ ràng.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">Tùy chọn nền mới:</p>
        <div className="grid grid-cols-4 gap-2">
          <button
            className="h-10 rounded-lg border-2 border-gray-300 bg-transparent bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2220%22%20height%3D%2220%22%3E%3Crect%20width%3D%2210%22%20height%3D%2210%22%20fill%3D%22%23ccc%22/%3E%3Crect%20x%3D%2210%22%20y%3D%2210%22%20width%3D%2210%22%20height%3D%2210%22%20fill%3D%22%23ccc%22/%3E%3C/svg%3E')] hover:border-green-500"
            title="Trong suốt"
          />
          <button
            className="h-10 rounded-lg border-2 border-gray-300 bg-white hover:border-green-500"
            title="Trắng"
          />
          <button
            className="h-10 rounded-lg border-2 border-gray-300 bg-black hover:border-green-500"
            title="Đen"
          />
          <button
            className="h-10 rounded-lg border-2 border-gray-300 bg-gradient-to-br from-blue-400 to-purple-500 hover:border-green-500"
            title="Gradient"
          />
        </div>
      </div>

      <button
        onClick={processRemoveBg}
        disabled={isProcessing || !image}
        className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
      >
        {isProcessing ? (
          <>
            <Loader2 size={20} className="animate-spin" />
            Đang xử lý...
          </>
        ) : (
          <>
            <Layers size={20} />
            Xóa nền ảnh
          </>
        )}
      </button>
    </div>
  );
};
