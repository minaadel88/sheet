import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Download, FileDown } from 'lucide-react';

interface BalanceSheet {
  id: string;
  start_date: string;
  end_date: string;
  start_balance: number;
  notes: string;
  created_at: string;
}

interface ApartmentPayment {
  apartment_number: string;
  resident_name: string;
  amount: number;
  paid: boolean;
}

interface FinancialEntry {
  description: string;
  amount: number;
  image_url?: string;
}

function BalanceSheetHistory() {
  const [balanceSheets, setBalanceSheets] = useState<BalanceSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSheets, setSelectedSheets] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  useEffect(() => {
    fetchBalanceSheets();
  }, []);

  const fetchBalanceSheets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('يجب تسجيل الدخول أولاً');
        return;
      }

      const { data, error } = await supabase
        .from('balance_sheets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBalanceSheets(data || []);
    } catch (error) {
      console.error('Error fetching balance sheets:', error);
      alert('حدث خطأ أثناء تحميل سجل الميزانيات');
    } finally {
      setLoading(false);
    }
  };

  const generateBalanceSheetContent = async (balanceSheet: any, apartmentPayments: any[], incomeEntries: any[], expenseEntries: any[]) => {
    const container = document.createElement('div');
    container.className = 'p-4 bg-white';
    container.style.width = '800px';
    container.style.direction = 'rtl';
    container.innerHTML = `
      <h1 class="text-2xl font-bold text-center mb-4">ميزانية صندوق عمارة 32 عمارات الاخاء</h1>
      <p class="text-lg text-center mb-4">(عمارات الشرطة)</p>
      
      <div class="mb-4">
        <p class="font-bold">الفترة: ${new Date(balanceSheet.start_date).toLocaleDateString('ar-EG')} إلى ${new Date(balanceSheet.end_date).toLocaleDateString('ar-EG')}</p>
        <p class="font-bold">الرصيد الافتتاحي: ${balanceSheet.start_balance} جنيه</p>
      </div>

      <div class="mb-4">
        <h2 class="text-xl font-bold mb-2">اشتراكات الشقق</h2>
        <div class="grid grid-cols-2 gap-2">
          ${apartmentPayments.map(payment => `
            <div class="p-2 border rounded ${payment.paid ? 'bg-green-50' : ''}">
              <p class="font-bold">${payment.apartment_number}</p>
              <p>${payment.resident_name}</p>
              <p>${payment.amount} جنيه ${payment.paid ? '(تم الدفع)' : ''}</p>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="mb-4">
        <h2 class="text-xl font-bold mb-2">الدخل الإضافي</h2>
        ${incomeEntries.map(entry => `
          <div class="p-2 border rounded mb-2">
            <p class="font-bold">${entry.description}</p>
            <p>${entry.amount} جنيه</p>
          </div>
        `).join('')}
      </div>

      <div class="mb-4">
        <h2 class="text-xl font-bold mb-2">المصروفات</h2>
        ${expenseEntries.map(entry => `
          <div class="p-2 border rounded mb-2">
            <p class="font-bold">${entry.description}</p>
            <p>${entry.amount} جنيه</p>
          </div>
        `).join('')}
      </div>

      <div class="mt-4 p-2 border-t">
        <p class="font-bold">إجمالي الدخل: ${calculateTotal(incomeEntries) + calculateTotal(apartmentPayments.filter(p => p.paid))} جنيه</p>
        <p class="font-bold">إجمالي المصروفات: ${calculateTotal(expenseEntries)} جنيه</p>
        <p class="font-bold">صافي الرصيد: ${balanceSheet.start_balance + calculateTotal(incomeEntries) + calculateTotal(apartmentPayments.filter(p => p.paid)) - calculateTotal(expenseEntries)} جنيه</p>
      </div>

      ${balanceSheet.notes ? `
        <div class="mt-4">
          <h2 class="text-xl font-bold mb-2">ملاحظات</h2>
          <p>${balanceSheet.notes}</p>
        </div>
      ` : ''}
    `;

    document.body.appendChild(container);
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true
    });
    document.body.removeChild(container);
    return canvas;
  };

  const generateSummaryContent = async (sheetsData: any[]) => {
    const container = document.createElement('div');
    container.className = 'p-4 bg-white';
    container.style.width = '800px';
    container.style.direction = 'rtl';

    let totalStartBalance = 0;
    let totalApartmentPayments = 0;
    let totalIncomeEntries = 0;
    let totalExpenseEntries = 0;

    sheetsData.forEach(data => {
      totalStartBalance += data.balanceSheet.start_balance;
      totalApartmentPayments += calculateTotal(data.apartmentPayments.filter((p: any) => p.paid));
      totalIncomeEntries += calculateTotal(data.incomeEntries);
      totalExpenseEntries += calculateTotal(data.expenseEntries);
    });

    const firstSheet = sheetsData[0].balanceSheet;
    const lastSheet = sheetsData[sheetsData.length - 1].balanceSheet;

    container.innerHTML = `
      <h1 class="text-2xl font-bold text-center mb-4">ملخص ميزانيات صندوق عمارة 32 عمارات الاخاء</h1>
      <p class="text-lg text-center mb-4">(عمارات الشرطة)</p>
      
      <div class="mb-6">
        <p class="font-bold">الفترة: ${new Date(firstSheet.start_date).toLocaleDateString('ar-EG')} إلى ${new Date(lastSheet.end_date).toLocaleDateString('ar-EG')}</p>
      </div>

      <div class="space-y-4">
        <div class="p-4 bg-gray-50 rounded-lg">
          <h2 class="text-xl font-bold mb-4">ملخص الفترة</h2>
          <div class="space-y-2">
            <p class="font-bold">إجمالي الرصيد الافتتاحي: ${totalStartBalance} جنيه</p>
            <p class="font-bold">إجمالي اشتراكات الشقق: ${totalApartmentPayments} جنيه</p>
            <p class="font-bold">إجمالي الدخل الإضافي: ${totalIncomeEntries} جنيه</p>
            <p class="font-bold">إجمالي المصروفات: ${totalExpenseEntries} جنيه</p>
            <p class="font-bold text-lg mt-4 ${totalStartBalance + totalApartmentPayments + totalIncomeEntries - totalExpenseEntries >= 0 ? 'text-green-600' : 'text-red-600'}">
              صافي الرصيد: ${totalStartBalance + totalApartmentPayments + totalIncomeEntries - totalExpenseEntries} جنيه
            </p>
          </div>
        </div>

        <div class="mt-6">
          <h2 class="text-xl font-bold mb-4">تفاصيل الميزانيات</h2>
          ${sheetsData.map(data => `
            <div class="p-4 border rounded-lg mb-4">
              <h3 class="font-bold">ميزانية ${new Date(data.balanceSheet.start_date).toLocaleDateString('ar-EG')} إلى ${new Date(data.balanceSheet.end_date).toLocaleDateString('ar-EG')}</h3>
              <div class="mt-2 space-y-1">
                <p>الرصيد الافتتاحي: ${data.balanceSheet.start_balance} جنيه</p>
                <p>اشتراكات الشقق: ${calculateTotal(data.apartmentPayments.filter((p: any) => p.paid))} جنيه</p>
                <p>الدخل الإضافي: ${calculateTotal(data.incomeEntries)} جنيه</p>
                <p>المصروفات: ${calculateTotal(data.expenseEntries)} جنيه</p>
                <p class="font-bold">صافي الرصيد: ${data.balanceSheet.start_balance + calculateTotal(data.apartmentPayments.filter((p: any) => p.paid)) + calculateTotal(data.incomeEntries) - calculateTotal(data.expenseEntries)} جنيه</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    document.body.appendChild(container);
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true
    });
    document.body.removeChild(container);
    return canvas;
  };

  const calculateTotal = (entries: { amount: number }[]) => {
    return entries.reduce((sum, entry) => sum + (entry.amount || 0), 0);
  };

  const downloadBalanceSheet = async (id: string) => {
    try {
      setIsGeneratingPDF(true);
      
      const [
        { data: balanceSheet },
        { data: apartmentPayments },
        { data: incomeEntries },
        { data: expenseEntries }
      ] = await Promise.all([
        supabase.from('balance_sheets').select('*').eq('id', id).single(),
        supabase.from('apartment_payments').select('*').eq('balance_sheet_id', id),
        supabase.from('income_entries').select('*').eq('balance_sheet_id', id),
        supabase.from('expense_entries').select('*').eq('balance_sheet_id', id)
      ]);

      const canvas = await generateBalanceSheetContent(
        balanceSheet,
        apartmentPayments || [],
        incomeEntries || [],
        expenseEntries || []
      );

      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });

      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 10;

      pdf.addImage(imgData, 'JPEG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`ميزانية-${new Date(balanceSheet.start_date).toLocaleDateString('ar-EG')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('حدث خطأ أثناء إنشاء ملف PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const downloadSelectedSheets = async () => {
    if (selectedSheets.length === 0) {
      alert('يرجى اختيار ميزانية واحدة على الأقل');
      return;
    }

    try {
      setIsGeneratingPDF(true);

      const sheetsData = await Promise.all(
        selectedSheets.map(async (id) => {
          const [
            { data: balanceSheet },
            { data: apartmentPayments },
            { data: incomeEntries },
            { data: expenseEntries }
          ] = await Promise.all([
            supabase.from('balance_sheets').select('*').eq('id', id).single(),
            supabase.from('apartment_payments').select('*').eq('balance_sheet_id', id),
            supabase.from('income_entries').select('*').eq('balance_sheet_id', id),
            supabase.from('expense_entries').select('*').eq('balance_sheet_id', id)
          ]);

          return {
            balanceSheet,
            apartmentPayments: apartmentPayments || [],
            incomeEntries: incomeEntries || [],
            expenseEntries: expenseEntries || []
          };
        })
      );

      const canvas = await generateSummaryContent(sheetsData);

      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });

      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 10;

      pdf.addImage(imgData, 'JPEG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`ملخص-الميزانيات-${new Date().toLocaleDateString('ar-EG')}.pdf`);
    } catch (error) {
      console.error('Error generating combined PDF:', error);
      alert('حدث خطأ أثناء إنشاء ملف PDF المجمع');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleDateFilter = () => {
    if (!startDate || !endDate) {
      alert('يرجى اختيار تاريخ البداية والنهاية');
      return;
    }

    const filteredSheets = balanceSheets.filter(sheet => {
      const sheetDate = new Date(sheet.created_at);
      const start = new Date(startDate);
      const end = new Date(endDate);
      return sheetDate >= start && sheetDate <= end;
    });

    setSelectedSheets(filteredSheets.map(sheet => sheet.id));
  };

  if (loading) {
    return (
      <div className="max-w-[800px] mx-auto p-4">
        <div className="text-center text-gray-600">جاري تحميل سجل الميزانيات...</div>
      </div>
    );
  }

  return (
    <div className="max-w-[800px] mx-auto p-4" dir="rtl">
      <h1 className="text-2xl font-bold mb-4 text-gray-800">سجل الميزانيات</h1>

      <div className="mb-6 bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-bold mb-2">تحميل ميزانيات مجمعة</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">من تاريخ:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">إلى تاريخ:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDateFilter}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            تطبيق الفلتر
          </button>
          <button
            onClick={downloadSelectedSheets}
            disabled={isGeneratingPDF || selectedSheets.length === 0}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors disabled:bg-gray-400 flex items-center gap-1"
          >
            <FileDown size={18} />
            {isGeneratingPDF ? 'جاري التحميل...' : 'تحميل المحدد'}
          </button>
        </div>
      </div>
      
      {balanceSheets.length === 0 ? (
        <div className="text-center text-gray-600">لا توجد ميزانيات محفوظة</div>
      ) : (
        <div className="grid gap-4">
          {balanceSheets.map((sheet) => (
            <div
              key={sheet.id}
              className={`bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow ${
                selectedSheets.includes(sheet.id) ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h2 className="font-bold text-lg text-gray-800">
                    ميزانية {new Date(sheet.start_date).toLocaleDateString('ar-EG')} إلى{' '}
                    {new Date(sheet.end_date).toLocaleDateString('ar-EG')}
                  </h2>
                  <p className="text-sm text-gray-600">
                    تم الإنشاء: {new Date(sheet.created_at).toLocaleDateString('ar-EG')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => downloadBalanceSheet(sheet.id)}
                    disabled={isGeneratingPDF}
                    className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors disabled:bg-gray-400 flex items-center gap-1"
                  >
                    <Download size={16} />
                    تحميل PDF
                  </button>
                  <input
                    type="checkbox"
                    checked={selectedSheets.includes(sheet.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedSheets([...selectedSheets, sheet.id]);
                      } else {
                        setSelectedSheets(selectedSheets.filter(id => id !== sheet.id));
                      }
                    }}
                    className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                </div>
              </div>
              {sheet.notes && (
                <p className="text-sm text-gray-600 mt-2">
                  ملاحظات: {sheet.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default BalanceSheetHistory;