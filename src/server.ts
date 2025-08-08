import express from 'express';
import cors from 'cors';
import { AutoChartingEngine } from './auto-charting';

const app = express();
const port = 8003;

app.use(cors());
app.use(express.json());

const chartingEngine = new AutoChartingEngine();

app.post('/suggest', (req, res) => {
  try {
    const { data, question } = req.body;
    
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ error: 'Invalid data format' });
    }
    
    const suggestions = chartingEngine.suggestCharts(data, question);
    
    res.json({
      success: true,
      suggestions: suggestions
    });
  } catch (error) {
    console.error('Error generating suggestions:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate suggestions' 
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'askadb-dashboard-core' 
  });
});

app.listen(port, () => {
  console.log(`Dashboard Core server listening on http://localhost:${port}`);
});
