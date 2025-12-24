import * as XLSX from 'xlsx';
import { FoodItem } from '../types';

export const exportToExcel = (logs: FoodItem[]) => {
  if (logs.length === 0) {
    alert("No data to export!");
    return;
  }

  // 1. Group logs by Date
  const groupedData: Record<string, FoodItem[]> = {};
  
  // Sort logs by date descending first
  const sortedLogs = [...logs].sort((a, b) => b.timestamp - a.timestamp);

  sortedLogs.forEach(log => {
    const dateKey = new Date(log.timestamp).toLocaleDateString();
    if (!groupedData[dateKey]) {
      groupedData[dateKey] = [];
    }
    groupedData[dateKey].push(log);
  });

  // 2. Build the Worksheet Data (Array of Arrays)
  const wsData: (string | number | null)[][] = [];

  // Main Header
  wsData.push(["SmartCal Nutrition Report"]);
  wsData.push(["Generated on", new Date().toLocaleString()]);
  wsData.push([]); // Spacer

  // Iterate through groups
  Object.keys(groupedData).forEach(date => {
    const dayLogs = groupedData[date];
    
    // Calculate Day Totals
    const totals = dayLogs.reduce((acc, log) => ({
      calories: acc.calories + log.calories,
      protein: acc.protein + log.macros.protein,
      carbs: acc.carbs + log.macros.carbs,
      fat: acc.fat + log.macros.fat
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

    // Section Header (Date)
    wsData.push([date.toUpperCase(), "", "", "", "", "", ""]);
    
    // Column Headers
    wsData.push(["Time", "Food Item", "Quantity/Desc", "Calories", "Protein (g)", "Carbs (g)", "Fat (g)"]);

    // Rows
    dayLogs.forEach(log => {
      wsData.push([
        new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        log.name,
        log.quantityStr,
        log.calories,
        log.macros.protein,
        log.macros.carbs,
        log.macros.fat
      ]);
    });

    // Summary Row for the Day
    wsData.push([
      "DAILY TOTAL", 
      "", 
      "", 
      totals.calories, 
      totals.protein, 
      totals.carbs, 
      totals.fat
    ]);

    // Empty row between days
    wsData.push([]); 
  });

  // 3. Create Workbook and Worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths for better readability
  const wscols = [
    {wch: 15}, // Time
    {wch: 30}, // Food Item
    {wch: 30}, // Quantity
    {wch: 10}, // Calories
    {wch: 10}, // Protein
    {wch: 10}, // Carbs
    {wch: 10}  // Fat
  ];
  ws['!cols'] = wscols;

  XLSX.utils.book_append_sheet(wb, ws, "Nutrition Log");

  // 4. Download
  XLSX.writeFile(wb, `SmartCal_Export_${new Date().toISOString().slice(0,10)}.xlsx`);
};