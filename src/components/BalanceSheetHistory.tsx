import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Download, FileDown, Loader2 } from 'lucide-react';

interface BalanceSheet {
  id: string;
  start_date: string;
  end_date: string;
  start_balance: number;
  notes: string;
  created_at: string;
  total_income?: number;
  total_expenses?: number;
  net_balance?: number;
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
  const [loadingBalances, setLoadingBalances] = useState<{ [key: string]: boolean }>({});

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

      const { data: sheets, error } = await supabase
        .from('balance_sheets')
        .select('*')
        .order('start_date', { ascending: false });

      if (error) throw error;

      // Fetch totals for each balance sheet
      const sheetsWithTotals = await Promise.all((sheets || []).map(async (sheet) => {
        setLoadingBalances(prev => ({ ...prev, [sheet.id]: true }));
        
        try {
          const [
            { data: apartmentPayments },
            { data: incomeEntries },
            { data: expenseEntries }
          ] = await Promise.all([
            supabase.from('apartment_payments').select('amount, paid').eq('balance_sheet_id', sheet.id),
            supabase.from('income_entries').select('amount').eq('balance_sheet_id', sheet.id),
            supabase.from('expense_entries').select('amount').eq('balance_sheet_id', sheet.id)
          ]);

          const totalApartmentPayments = (apartmentPayments || [])
            .filter(p => p.paid)
            .reduce((sum, p) => sum + (p.amount || 0), 0);

          const totalIncome = (incomeEntries || [])
            .reduce((sum, entry) => sum + (entry.amount || 0), 0);

          const totalExpenses = (expenseEntries || [])
            .reduce((sum, entry) => sum + (entry.amount || 0), 0);

          return {
            ...sheet,
            total_income: totalApartmentPayments + totalIncome,
            total_expenses: totalExpenses,
            net_balance: sheet.start_balance + totalApartmentPayments + totalIncome - totalExpenses
          };
        } finally {
          setLoadingBalances(prev => ({ ...prev, [sheet.id]: false }));
        }
      }));

      setBalanceSheets(sheetsWithTotals);
    } catch (error) {
      console.error('Error fetching balance sheets:', error);
      alert('حدث خطأ أثناء تحميل سجل الميزانيات');
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async (canvas: HTMLCanvasElement, filename: string) => {
    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const contentWidth = pageWidth - (margin * 2);
    
    const contentHeight = (canvas.height * contentWidth) / canvas.width;
    
    let remainingHeight = contentHeight;
    let sourceY = 0;
    let currentPage = 0;

    while (remainingHeight > 0) {
      if (currentPage > 0) {
        pdf.addPage();
      }

      const pageContentHeight = Math.min(remainingHeight, pageHeight - (margin * 2));
      
      const sourceHeight = (pageContentHeight * canvas.height) / contentHeight;
      
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = sourceHeight;
      const ctx = tempCanvas.getContext('2d');
      
      if (ctx) {
        ctx.drawImage(
          canvas,
          0, sourceY, canvas.width, sourceHeight,
          0, 0, canvas.width, sourceHeight
        );
        
        const imgData = tempCanvas.toDataURL('image/jpeg', 1.0);
        pdf.addImage(
          imgData,
          'JPEG',
          margin,
          margin,
          contentWidth,
          pageContentHeight,
          '',
          'FAST'
        );
      }

      remainingHeight -= pageContentHeight;
      sourceY += sourceHeight;
      currentPage++;
    }

    pdf.save(filename);
  };

  const generateBalanceSheetContent = async (balanceSheet: any, apartmentPayments: any[], incomeEntries: any[], expenseEntries: any[]) => {
    const container = document.createElement('div');
    container.className = 'p-8 bg-white';
    container.style.width = '1000px';
    container.style.direction = 'rtl';
    container.style.fontFamily = 'Arial, sans-serif';

    const totalApartmentPayments = calculateTotal(apartmentPayments.filter(p => p.paid));
    const totalIncome = calculateTotal(incomeEntries);
    const totalExpenses = calculateTotal(expenseEntries);
    const netBalance = balanceSheet.start_balance + totalApartmentPayments + totalIncome - totalExpenses;

    const apartmentPaymentsHTML = [];
    for (let i = 0; i < apartmentPayments.length; i += 4) {
        const row = apartmentPayments.slice(i, i + 4);
        apartmentPaymentsHTML.push(`
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 8px;">
                ${row.map(payment => `
                    <div style="padding: 8px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: ${payment.paid ? '#f0fdf4' : '#ffffff'}; font-size: 14px;">
                        <p style="font-weight: bold; margin: 0 0 4px 0;">${payment.apartment_number}</p>
                        <p style="margin: 0 0 4px 0; font-size: 12px;">${payment.resident_name}</p>
                        <p style="margin: 0; color: ${payment.paid ? '#059669' : '#374151'};">
                            ${payment.amount} جنيه ${payment.paid ? '✓' : ''}
                        </p>
                    </div>
                `).join('')}
            </div>
        `);
    }

    container.innerHTML = `
        <div style="max-width: 100%; margin: 0 auto;">
            <h1 style="font-size: 24px; font-weight: bold; text-align: center; margin-bottom: 16px; color: #1f2937;">
                ميزانية صندوق عمارة 32 عمارات الاخاء
            </h1>
            <p style="font-size: 18px; text-align: center; margin-bottom: 24px; color: #4b5563;">
                (عمارات الشرطة)
            </p>
            
            <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
                <p style="font-weight: bold; margin-bottom: 8px; font-size: 16px;">
                    الفترة: ${new Date(balanceSheet.start_date).toLocaleDateString('ar-EG')} إلى ${new Date(balanceSheet.end_date).toLocaleDateString('ar-EG')}
                </p>
                <p style="font-weight: bold; font-size: 16px;">
                    الرصيد الافتتاحي: ${balanceSheet.start_balance} جنيه
                </p>
            </div>

            <div style="margin-bottom: 32px;">
                <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 16px; color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">
                    اشتراكات الشقق
                </h2>
                ${apartmentPaymentsHTML.join('')}
            </div>

            <div style="margin-bottom: 32px;">
                <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 16px; color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">
                    الدخل الإضافي
                </h2>
                <div style="display: grid; gap: 8px;">
                    ${incomeEntries.map(entry => `
                        <div style="padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff;">
                            <p style="font-weight: bold; margin: 0 0 4px 0;">${entry.description}</p>
                            <p style="margin: 0; color: #059669;">${entry.amount} جنيه</p>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div style="margin-bottom: 32px;">
                <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 16px; color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">
                    المصروفات
                </h2>
                <div style="display: grid; gap: 8px;">
                    ${expenseEntries.map(entry => `
                        <div style="padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff;">
                            <p style="font-weight: bold; margin: 0 0 4px 0;">${entry.description}</p>
                            <p style="margin: 0; color: #dc2626;">${entry.amount} جنيه</p>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-top: 32px;">
                <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 16px; color: #1f2937;">
                    ملخص الميزانية
                </h2>
                <div style="display: grid; gap: 8px; font-size: 16px;">
                    <p style="margin: 0;"><strong>إجمالي اشتراكات الشقق:</strong> ${totalApartmentPayments} جنيه</p>
                    <p style="margin: 0;"><strong>إجمالي الدخل الإضافي:</strong> ${totalIncome} جنيه</p>
                    <p style="margin: 0;"><strong>إجمالي المصروفات:</strong> ${totalExpenses} جنيه</p>
                    <p style="margin: 0; font-size: 18px; font-weight: bold; color: ${netBalance >= 0 ? '#059669' : '#dc2626'}; padding-top: 8px; border-top: 1px solid #e5e7eb;">
                        صافي الرصيد: ${netBalance} جنيه
                    </p>
                </div>
            </div>

            ${balanceSheet.notes ? `
                <div style="margin-top: 32px;">
                    <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 16px; color: #1f2937;">ملاحظات</h2>
                    <p style="padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff;">${balanceSheet.notes}</p>
                </div>
            ` : ''}
        </div>
    `;

    document.body.appendChild(container);
    const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        windowWidth: 1000,
        windowHeight: container.offsetHeight
    });
    document.body.removeChild(container);
    return canvas;
  };

  const generateSummaryContent = async (sheetsData: any[]) => {
    const container = document.createElement('div');
    container.className = 'p-8 bg-white';
    container.style.width = '800px';
    container.style.direction = 'rtl';
    container.style.fontFamily = 'Arial, sans-serif';

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
    const netBalance = totalStartBalance + totalApartmentPayments + totalIncomeEntries - totalExpenseEntries;

    container.innerHTML = `
      <h1 style="font-size: 24px; font-weight: bold; text-align: center; margin-bottom: 16px;">
        ملخص ميزانيات صندوق عمارة 32 عمارات الاخاء
      </h1>
      <p style="font-size: 18px; text-align: center; margin-bottom: 24px;">
        (عمارات الشرطة)
      </p>
      
      <div style="margin-bottom: 32px;">
        <p style="font-weight: bold; font-size: 18px;">
          الفترة: ${new Date(firstSheet.start_date).toLocaleDateString('ar-EG')} إلى ${new Date(lastSheet.end_date).toLocaleDateString('ar-EG')}
        </p>
      </div>

      <div style="margin-bottom: 32px; padding: 24px; background-color: #f9fafb; border-radius: 12px;">
        <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 16px;">ملخص الفترة</h2>
        <div style="display: grid; gap: 12px;">
          <p style="font-weight: bold;">إجمالي الرصيد الافتتاحي: ${totalStartBalance} جنيه</p>
          <p style="font-weight: bold;">إجمالي اشتراكات الشقق: ${totalApartmentPayments} جنيه</p>
          <p style="font-weight: bold;">إجمالي الدخل الإضافي: ${totalIncomeEntries} جنيه</p>
          <p style="font-weight: bold;">إجمالي المصروفات: ${totalExpenseEntries} جنيه</p>
          <p style="font-weight: bold; font-size: 20px; margin-top: 16px; color: ${netBalance >= 0 ? '#059669' : '#dc2626'}">
            صافي الرصيد: ${netBalance} جنيه
          </p>
        </div>
      </div>

      <div style="margin-top: 32px;">
        <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 24px;">تفاصيل الميزانيات</h2>
        ${sheetsData.map(data => {
          const sheetNetBalance = data.balanceSheet.start_balance + 
            calculateTotal(data.apartmentPayments.filter((p: any) => p.paid)) + 
            calculateTotal(data.incomeEntries) - 
            calculateTotal(data.expenseEntries);
          
          return `
            <div style="padding: 16px; border: 1px solid #e5e7eb; border-radius: 12px; margin-bottom: 16px;">
              <h3 style="font-weight: bold; margin-bottom: 12px;">
                ميزانية ${new Date(data.balanceSheet.start_date).toLocaleDateString('ar-EG')} إلى ${new Date(data.balanceSheet.end_date).toLocaleDateString('ar-EG')}
              </h3>
              <div style="display: grid; gap: 8px;">
                <p>الرصيد الافتتاحي: ${data.balanceSheet.start_balance} جنيه</p>
                <p>اشتراكات الشقق: ${calculateTotal(data.apartmentPayments.filter((p: any) => p.paid))} جنيه</p>
                <p>الدخل الإضافي: ${calculateTotal(data.incomeEntries)} جنيه</p>
                <p>المصروفات: ${calculateTotal(data.expenseEntries)} جنيه</p>
                <p style="font-weight: bold; color: ${sheetNetBalance >= 0 ? '#059669' : '#dc2626'}">
                  صافي الرصيد: ${sheetNetBalance} جنيه
                </p>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    document.body.appendChild(container);
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      windowWidth: 800,
      windowHeight: container.offsetHeight
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

      await generatePDF(canvas, `ميزانية-${new Date(balanceSheet.start_date).toLocaleDateString('ar-EG')}.pdf`);
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
      await generatePDF(canvas, `ملخص-الميزانيات-${new Date().toLocaleDateString('ar-EG')}.pdf`);
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
                  {!loadingBalances[sheet.id] && (
                    <div className="mt-2 space-y-1">
                      <p className="text-sm">الرصيد الافتتاحي: {sheet.start_balance} جنيه</p>
                      <p className="text-sm">إجمالي الدخل: {sheet.total_income} جنيه</p>
                      <p className="text-sm">إجمالي المصروفات: {sheet.total_expenses} جنيه</p>
                      <p className={`text-sm font-bold ${sheet.net_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        صافي الرصيد: {sheet.net_balance} جنيه
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {loadingBalances[sheet.id] ? (
                    <div className="flex items-center">
                      <Loader2 className="animate-spin" size={16} />
                    </div>
                  ) : (
                    <>
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
                    </>
                  )}
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
