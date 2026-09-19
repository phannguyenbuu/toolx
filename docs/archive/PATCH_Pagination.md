# PATCH: Add Pagination

## Simple Pagination Component

### Create: src/components/Pagination.tsx
```typescript
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded hover:bg-gray-100 disabled:opacity-50"
      >
        <ChevronLeft size={16} />
      </button>
      
      <span className="text-sm">
        Trang {currentPage} / {totalPages}
      </span>
      
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded hover:bg-gray-100 disabled:opacity-50"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
};
```

## Usage
```typescript
const [page, setPage] = useState(1);
const itemsPerPage = 10;
const totalPages = Math.ceil(items.length / itemsPerPage);
const paginatedItems = items.slice((page - 1) * itemsPerPage, page * itemsPerPage);

<Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
```

Done!
