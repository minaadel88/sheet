import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Upload, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface FinancialEntry {
  id: string;
  description: string;
  amount: number;
  image?: string;
}

interface ApartmentPayment {
  id: string;
  name: string;
  paid: boolean;
  amount: number;
}

function BalanceSheet() {
  const contentRef = useRef<HTMLDivElement>(null);
  const [startBalance, setStartBalance] = useState<number>(0);
  const [incomeEntries, setIncomeEntries] = useState<FinancialEntry[]>([
    { id: '1', description: '', amount: 0 }
  ]);
  const [expenseEntries, setExpenseEntries] = useState<FinancialEntry[]>([
    { id: '1', description: '', amount: 0 }
  ]);
  const [notes, setNotes] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isPrinting, setIsPrinting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [apartmentPayments, setApartmentPayments] = useState<ApartmentPayment[]>([
    { id: '1', name: 'شقة 1/ أ/ احمد سليم', paid: false, amount: 0 },
    { id: '2', name: 'شقة 2/ لواء / محمد عثمان', paid: false, amount: 0 },
    { id: '3', name: 'شقة 11/ أ /عماد الدين ', paid: false, amount: 0 },
    { id: '4', name: 'شقة 12/أ / ايمن البدرى ', paid: false, amount: 0 },
    { id: '5', name: 'شقة 13 /عميد / ياسر شلتوت', paid: false, amount: 0 },
    { id: '6', name: 'شقة 14 / أ/ اسلام فاضل', paid: false, amount: 0 },
    { id: '7', name: 'شقة 21 / أ/ خالد ', paid: false, amount: 0 },
    { id: '8', name: 'شقة 22 / دكتور / سمير', paid: false, amount: 0 },
    { id: '9', name: 'شقة 23 / م/ حسن المصرى', paid: false, amount: 0 },
    { id: '10', name: 'شقة 24 / أ /محمد عبدالظاهر', paid: false, amount: 0 },
    { id: '11', name: 'شقة 31 / دكتور / يحيى زكريا', paid: false, amount: 0 },
    { id: '12', name: 'شقة 32 / دكتور / اشرف ', paid: false, amount: 0 },
    { id: '13', name: 'شقة 33/ أ/ محمد المصرى', paid: false, amount: 0 },
    { id: '14', name: 'شقة 34/ دكتور / احمد سمير', paid: false, amount: 0 },
    { id: '15', name: 'شقة 41/ ك /عبدالرحمن نصر الدين', paid: false, amount: 0 },
    { id: '16', name: 'شقة 42/لواء / محسن صلاح الدين ', paid: false, amount: 0 },
    { id: '17', name: 'شقة 43 /م / عماد على ', paid: false, amount: 0 },
    { id: '18', name: 'شقة 44 / لواء / اسامة ابو زيد', paid: false, amount: 0 },
    { id: '19', name: 'شقة 51 / م/ يسرى لطفى ', paid: false, amount: 0 },
    { id: '20', name: 'شقة 52 / مستشار / عبدالله', paid: false, amount: 0 },
    { id: '21', name: 'شقة 53 / م/ محمد اسامة', paid: false, amount: 0 },
    { id: '22', name: 'شقة 54 / دكتور /يحيى النمر', paid: false, amount: 0 },
    { id: '23', name: 'شقة 61 / م / كامل القاضى', paid: false, amount: 0 },
    { id: '24', name: 'شقة 62 / لواء/ بليغ ', paid: false, amount: 0 },
    { id: '25', name: 'شقة 63 / لواء.د/ ايمان الشربينى ', paid: false, amount: 0 },
    { id: '26', name: 'شقة 64 / أ / نائل', paid: false, amount: 0 },
    { id: '27', name: 'شقة 71 / مستشار/ اسلام ', paid: false, amount: 0 },
    { id: '28', name: 'شقة 72 / دكتور /مجدى النشار', paid: false, amount: 0 },
    { id: '29', name: 'شقة 73 / لواء / فوزى ', paid: false, amount: 0 },
    { id: '30', name: 'شقة 74 / م / احمد فرج ', paid: false, amount: 0 },
    { id: '31', name: 'شقة 81/ ك/ احمد فهمى', paid: false, amount: 0 },
    { id: '32', name: 'شقة 82/ لواء / احمد ممتاز', paid: false, amount: 0 },
    { id: '33', name: 'شقة 83/ دكتور /فهمى  ابو غدير', paid: false, amount: 0 },
    { id: '34', name: 'شقة 84/دكتورة / اسماء  ', paid: false, amount: 0 },
    { id: '35', name: 'شقة 91 /دكتور / ريم الدسوقى', paid: false, amount: 0 },
    { id: '36', name: 'شقة 92 / م/ علاء عبدالحافظ', paid: false, amount: 0 },
    { id: '37', name: 'شقة 93 / م/ هشام فضل ', paid: false, amount: 0 },
    { id: '38', name: 'شقة 94 / لواء / عادل عدلى', paid: false, amount: 0 }
  ]);

  const handleImageUpload = async (id: string, type: 'income' | 'expense', event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('حجم الصورة كبير جداً. الحد الأقصى هو 5 ميجابايت');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      if (type === 'income') {
        setIncomeEntries((entries) =>
          entries.map((entry) => (entry.id === id ? { ...entry, image: base64String } : entry))
        );
      } else {
        setExpenseEntries((entries) =>
          entries.map((entry) => (entry.id === id ? { ...entry, image: base64String } : entry))
        );
      }
    };
    reader.readAsDataURL(file);
  };

  const updateApartmentPayment = (id: string, field: 'paid' | 'amount', value: boolean | number) => {
    setApartmentPayments(
      apartmentPayments.map((payment) =>
        payment.id === id ? { ...payment, [field]: value } : payment
      )
    );
  };

  const addEntry = (type: 'income' | 'expense') => {
    const newEntry = { id: Date.now().toString(), description: '', amount: 0 };
    if (type === 'income') {
      setIncomeEntries([...incomeEntries, newEntry]);
    } else {
      setExpenseEntries([...expenseEntries, newEntry]);
    }
  };

  const updateEntry = (
    id: string,
    field: 'description' | 'amount',
    value: string | number,
    type: 'income' | 'expense'
  ) => {
    const updateEntries = (entries: FinancialEntry[]) =>
      entries.map((entry) => (entry.id === id ? { ...entry, [field]: value } : entry));
    if (type === 'income') {
      setIncomeEntries(updateEntries(incomeEntries));
    } else {
      setExpenseEntries(updateEntries(expenseEntries));
    }
  };

  const totalApartmentPayments = apartmentPayments.reduce(
    (sum, payment) => sum + (payment.paid ? payment.amount : 0),
    0
  );

  const totalIncome = incomeEntries.reduce((sum, entry) => sum + entry.amount, 0) + totalApartmentPayments;
  const totalExpenses = expenseEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const netBalance = startBalance + totalIncome - totalExpenses;

  const generatePDF = async () => {
    if (!contentRef.current) return;

    try {
      setIsPrinting(true);

      // Clone the content for printing
      const printContent = contentRef.current.cloneNode(true) as HTMLElement;

      // Remove elements that should not appear in the print version
      printContent.querySelectorAll('.print\\:hidden:not(img)').forEach(el => el.remove());

      // Adjust image styles for better appearance
      printContent.querySelectorAll('img').forEach(img => {
        img.classList.remove('print:hidden');
        (img as HTMLImageElement).style.maxWidth = '150px';
        (img as HTMLImageElement).style.height = '80px';
        (img as HTMLImageElement).style.margin = '10px';
      });

      // Style adjustments for the cloned content
      printContent.style.width = '900px';
      printContent.style.position = 'relative';
      printContent.style.fontFamily = 'Arial, sans-serif';
      printContent.style.fontSize = '16px';
      printContent.style.lineHeight = '1.9';

      document.body.appendChild(printContent);

      const canvas = await html2canvas(printContent, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        scrollY: -window.scrollY,
        onclone: (clonedDoc) => {
          const allText = clonedDoc.querySelectorAll('p, h1, h2, h3, td, th, div');
          allText.forEach(el => {
            (el as HTMLElement).style.fontSize = '18px';
            (el as HTMLElement).style.lineHeight = '1.6';
          });

          const headers = clonedDoc.querySelectorAll('h1, h2');
          headers.forEach(el => {
            (el as HTMLElement).style.fontSize = '20px';
            (el as HTMLElement).style.marginBottom = '10px';
          });

          const sections = clonedDoc.querySelectorAll('.mb-8');
          sections.forEach(el => {
            (el as HTMLElement).style.marginBottom = '20px';
          });
        }
      });

      document.body.removeChild(printContent);

      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;

      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const imgWidth = pageWidth - (margin * 2);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let position = margin;
      let heightLeft = imgHeight;

      pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight, '', 'FAST');
      heightLeft -= (pageHeight - margin * 2);

      if (heightLeft > 0) {
        position = -(pageHeight + margin);
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight, '', 'FAST');
      }

      pdf.save('الميزانية-المالية.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('حدث خطأ أثناء إنشاء ملف PDF. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsPrinting(false);
    }
  };

  const saveBalanceSheet = async () => {
    try {
      setIsSaving(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('يجب تسجيل الدخول أولاً');
        return;
      }

      const { data: balanceSheet, error: balanceSheetError } = await supabase
        .from('balance_sheets')
        .insert({
          user_id: user.id,
          start_date: startDate,
          end_date: endDate,
          start_balance: startBalance,
          notes
        })
        .select()
        .single();

      if (balanceSheetError) throw balanceSheetError;

      const apartmentPaymentsToInsert = apartmentPayments.map(payment => ({
        balance_sheet_id: balanceSheet.id,
        apartment_number: payment.name.split('/')[0].trim(),
        resident_name: payment.name.split('/').slice(1).join('/').trim(),
        amount: payment.amount,
        paid: payment.paid
      }));

      const { error: apartmentPaymentsError } = await supabase
        .from('apartment_payments')
        .insert(apartmentPaymentsToInsert);

      if (apartmentPaymentsError) throw apartmentPaymentsError;

      const incomeEntriesToInsert = incomeEntries.map(entry => ({
        balance_sheet_id: balanceSheet.id,
        description: entry.description,
        amount: entry.amount,
        image_url: entry.image
      }));

      const { error: incomeEntriesError } = await supabase
        .from('income_entries')
        .insert(incomeEntriesToInsert);

      if (incomeEntriesError) throw incomeEntriesError;

      const expenseEntriesToInsert = expenseEntries.map(entry => ({
        balance_sheet_id: balanceSheet.id,
        description: entry.description,
        amount: entry.amount,
        image_url: entry.image
      }));

      const { error: expenseEntriesError } = await supabase
        .from('expense_entries')
        .insert(expenseEntriesToInsert);

      if (expenseEntriesError) throw expenseEntriesError;

      alert('تم حفظ الميزانية بنجاح');
    } catch (error) {
      console.error('Error saving balance sheet:', error);
      alert('حدث خطأ أثناء حفظ الميزانية');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div 
        ref={contentRef} 
        className="max-w-[800px] mx-auto bg-white p-4 shadow-lg print:shadow-none print:p-2" 
        dir="rtl"
      >
        <h1 className="text-xl font-bold text-center mb-4 text-gray-800">
          ميزانية صندوق عمارة 32 عمارات الاخاء
          <p className="text-lg mt-1">(عمارات الشرطة)</p>
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div className="print:w-full">
            <label className="block font-bold mb-1 text-gray-700">من تاريخ:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-1 border rounded-lg focus:ring-2 focus:ring-blue-500 print:border-none print:p-0 text-right"
            />
          </div>
          <div className="print:w-full">
            <label className="block font-bold mb-1 text-gray-700">حتى تاريخ:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-1 border rounded-lg focus:ring-2 focus:ring-blue-500 print:border-none print:p-0 text-right"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block font-bold mb-1 text-gray-700">رصيد بداية الفترة:</label>
          <input
            type="number"
            value={startBalance}
            onChange={(e) => setStartBalance(Number(e.target.value))}
            className="w-full p-1 border rounded-lg focus:ring-2 focus:ring-blue-500 print:border-none print:p-0 text-right"
            placeholder="أدخل الرصيد الافتتاحي"
          />
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-bold mb-3 text-gray-800">اشتراكات الشقق في الصيانة الشهرية</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1">
            {apartmentPayments.map((payment) => (
              <div
                key={payment.id}
                className={`p-1 rounded-md border ${payment.paid ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}
              >
                <div className="font-bold text-gray-800 mb-1 text-xs">{payment.name}</div>
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center justify-between gap-1">
                    <button
                      onClick={() => updateApartmentPayment(payment.id, 'paid', !payment.paid)}
                      className={`p-0.5 rounded-full ${payment.paid ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'} print:hidden`}
                    >
                      {payment.paid ? '✓' : '✗'}
                    </button>
                    <input
                      type="number"
                      value={payment.amount}
                      onChange={(e) => updateApartmentPayment(payment.id, 'amount', Number(e.target.value))}
                      className="w-full p-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right text-base font-normal placeholder-gray-400 print:border-none print:p-2 print:text-base print:break-words"
                      placeholder="المبلغ"
                      step="0.01"
                      min="0"
                    />
                  </div>
                  {payment.paid && (
                    <div className="text-center text-green-600 font-bold bg-green-100 p-0.5 rounded-md text-xs">
                      تم الدفع ✓
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-bold mb-3 text-gray-800">دخل إضافي</h2>
          <div className="space-y-2">
            {incomeEntries.map((entry) => (
              <div key={entry.id} className="p-2 border rounded-lg bg-white">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-1">
                  <div>
                    <label className="block font-bold mb-1 text-gray-700 text-sm">وصف الدخل:</label>
                    <input
                      type="text"
                      value={entry.description}
                      onChange={(e) => updateEntry(entry.id, 'description', e.target.value, 'income')}
                      className="w-full p-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                      placeholder="وصف الدخل"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1 text-gray-700 text-sm">المبلغ:</label>
                    <input
                      type="number"
                      value={entry.amount}
                      onChange={(e) => updateEntry(entry.id, 'amount', Number(e.target.value), 'income')}
                      className="w-full p-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                      placeholder="المبلغ"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 cursor-pointer text-blue-600 hover:text-blue-700 print:hidden text-sm">
                    <Upload size={16} />
                    <span>إضافة صورة</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(entry.id, 'income', e)}
                      className="hidden"
                    />
                  </label>
                  {entry.image && (
                    <img
                      src={entry.image}
                      alt="إيصال"
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => addEntry('income')}
            className="mt-1 text-green-600 hover:bg-green-50 p-1 rounded-lg print:hidden text-sm"
          >
            إضافة دخل جديد
          </button>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-bold mb-3 text-gray-800">المصروفات</h2>
          <div className="space-y-2">
            {expenseEntries.map((entry) => (
              <div key={entry.id} className="p-2 border rounded-lg bg-white">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-1">
                  <div>
                    <label className="block font-bold mb-1 text-gray-700 text-sm">وصف المصروف:</label>
                    <input
                      type="text"
                      value={entry.description}
                      onChange={(e) => updateEntry(entry.id, 'description', e.target.value, 'expense')}
                      className="w-full p-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                      placeholder="وصف المصروف"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1 text-gray-700 text-sm">المبلغ:</label>
                    <input
                      type="number"
                      value={entry.amount}
                      onChange={(e) => updateEntry(entry.id, 'amount', Number(e.target.value), 'expense')}
                      className="w-full p-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                      placeholder="المبلغ"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 cursor-pointer text-blue-600 hover:text-blue-700 print:hidden text-sm">
                    <Upload size={16} />
                    <span>إضافة صورة</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(entry.id, 'expense', e)}
                      className="hidden"
                    />
                  </label>
                  {entry.image && (
                    <img
                      src={entry.image}
                      alt="إيصال"
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => addEntry('expense')}
            className="mt-1 text-green-600 hover:bg-green-50 p-1 rounded-lg print:hidden text-sm"
          >
            إضافة مصروف جديد
          </button>
        </div>

        <div className="mb-4 p-2 bg-gray-50 rounded-lg">
          <p className="font-bold text-gray-700 mb-1 text-sm">إجمالي الدخل: {totalIncome} جنيه</p>
          <p className="font-bold text-gray-700 mb-1 text-sm">إجمالي المصروفات: {totalExpenses} جنيه</p>
          <p className={`font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'} text-sm`}>
            صافي الرصيد: {netBalance} جنيه
          </p>
        </div>

        <div className="mb-4">
          <label className="block font-bold mb-1 text-gray-700 text-sm">ملاحظات:</label>
          <div className="print:text-center print:min-h-[60px] print:border print:p-2 print:rounded-lg text-sm">
            {notes || 'لا توجد ملاحظات'}
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full p-2 border rounded-lg min-h-[80px] resize-y print:hidden text-sm"
            placeholder="أضف ملاحظاتك هنا..."
          />
        </div>

        <div className="flex gap-2 print:hidden">
          {!isPrinting && (
            <button
              onClick={generatePDF}
              className="w-full sm:w-auto bg-blue-600 text-white px-4 py-1 rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              تحميل كملف PDF
            </button>
          )}
          
          <button
            onClick={saveBalanceSheet}
            disabled={isSaving}
            className="w-full sm:w-auto bg-green-600 text-white px-4 py-1 rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center justify-center gap-1"
          >
            <Save size={16} />
            {isSaving ? 'جاري الحفظ...' : 'حفظ الميزانية'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default BalanceSheet;