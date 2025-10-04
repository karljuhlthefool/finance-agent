// Test script to verify descriptions are being captured
// Run this in the browser console at http://localhost:3031

console.log('🧪 Starting Description Test...\n');

// Simulate the actual data flow
const testEvents = [
  {
    type: 'data',
    event: 'agent.text',
    text: '"Fetching real-time quote data for TSLA"'
  },
  {
    type: 'data',
    event: 'agent.tool-start',
    tool_id: 'test-tool-1',
    tool: 'Bash',
    cli_tool: 'mf-market-get',
    metadata: { ticker: 'TSLA', fields: ['quote'] },
    args: { ticker: 'TSLA', fields: ['quote'] }
  }
];

let lastAgentText = null;

console.log('Processing test events:\n');

testEvents.forEach((event, index) => {
  console.log(`\n📦 Event ${index}: ${event.event}`);
  
  if (event.event === 'agent.text') {
    const text = event.text?.trim();
    const wordCount = text ? text.split(' ').length : 0;
    
    console.log('  💬 Text:', text);
    console.log('  📊 Word count:', wordCount);
    console.log('  ✓ Will capture?', wordCount <= 12);
    
    if (text && wordCount <= 12) {
      lastAgentText = text;
      console.log('  ✅ CAPTURED as description!');
    } else {
      lastAgentText = null;
      console.log('  ❌ NOT captured (too long)');
    }
  }
  
  if (event.event === 'agent.tool-start') {
    console.log('  🔧 Tool starting...');
    console.log('  🎯 Last agent text:', lastAgentText);
    console.log('  📎 Description to attach:', lastAgentText || '(none)');
    
    if (lastAgentText) {
      console.log('  ✅ SUCCESS! Description would be attached to tool card!');
    } else {
      console.log('  ❌ FAIL! No description to attach!');
    }
  }
});

console.log('\n\n🎯 Test Complete!');
console.log('Expected: Description should be captured and attached');
console.log('Result:', lastAgentText ? '✅ PASS' : '❌ FAIL');

