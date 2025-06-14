// Mock agent service to simulate agent behavior
// This would be replaced with actual API calls in a real implementation

// Generate a random session ID
const generateSessionId = () => {
  return 'session-' + Math.random().toString(36).substring(2, 15);
};

// Simulate tool execution with delays
const simulateToolExecution = async (toolName, delay, result) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        tool: toolName,
        status: 'Finished',
        result: result
      });
    }, delay);
  });
};

// Predefined responses for different queries
const queryResponses = {
  'default': {
    tools: [
      {
        tool: 'search_documents',
        result: 'Found 3 relevant documents:\n- Document 1: Project specifications\n- Document 2: Building codes\n- Document 3: Material specifications'
      },
      {
        tool: 'analyze_requirements',
        result: 'Requirements analysis complete:\n- Minimum floor area: 2000 sq ft\n- Maximum height: 30 ft\n- Energy efficiency rating: A'
      },
      {
        tool: 'generate_options',
        result: 'Generated 4 design options with different layouts and specifications.'
      }
    ],
    finalAnswer: 'Based on the requirements analysis and available documents, I\'ve generated 4 design options that meet all specifications. Each option varies in layout, material usage, and energy efficiency approaches. Option 3 provides the best balance of space utilization and energy efficiency.'
  },
  'show me a house': {
    tools: [
      {
        tool: 'search_building_types',
        result: 'Found residential building types:\n- Single family home\n- Duplex\n- Townhouse\n- Apartment building'
      },
      {
        tool: 'analyze_residential_requirements',
        result: 'Standard residential requirements:\n- Minimum bedroom size: 70 sq ft\n- Minimum ceiling height: 7 ft\n- Egress requirements for bedrooms\n- Kitchen and bathroom ventilation'
      },
      {
        tool: 'generate_house_design',
        result: 'Generated basic house design with:\n- 3 bedrooms\n- 2 bathrooms\n- Open concept kitchen/living area\n- 2-car garage\n- Total area: 1,800 sq ft'
      },
      {
        tool: 'calculate_energy_efficiency',
        result: 'Energy efficiency calculation:\n- Insulation R-value: 19 (walls), 38 (roof)\n- Window efficiency: U-factor 0.30\n- HVAC efficiency: 16 SEER\n- Estimated energy consumption: 45 kWh/m²/year'
      }
    ],
    finalAnswer: 'I\'ve designed a 1,800 sq ft single-family home with 3 bedrooms and 2 bathrooms. The design features an open concept living area, energy-efficient appliances, and meets all standard residential building codes. The estimated energy consumption is 45 kWh/m²/year, which qualifies for an A energy rating.'
  },
  'design an office building': {
    tools: [
      {
        tool: 'search_commercial_requirements',
        result: 'Commercial building requirements:\n- Accessibility standards (ADA compliance)\n- Fire safety regulations\n- Minimum parking requirements\n- Ventilation standards for commercial spaces'
      },
      {
        tool: 'analyze_office_space_needs',
        result: 'Office space analysis:\n- Typical workspace: 75-150 sq ft per employee\n- Conference rooms: 25-30 sq ft per person\n- Circulation space: 25-30% of total area\n- Support spaces (kitchen, restrooms): 15-20% of total area'
      },
      {
        tool: 'generate_office_layout',
        result: 'Generated office building layout:\n- 5 floors, 10,000 sq ft per floor\n- Open office areas with flexible workstations\n- 8 conference rooms of varying sizes\n- Central core with elevators, stairs, and restrooms\n- Ground floor reception and café area'
      },
      {
        tool: 'calculate_construction_costs',
        result: 'Construction cost estimate:\n- Structure: $8.5M\n- MEP systems: $3.2M\n- Interior finishes: $2.8M\n- Site work: $1.5M\n- Total estimated cost: $16M ($320 per sq ft)'
      }
    ],
    finalAnswer: 'I\'ve designed a 50,000 sq ft office building with 5 floors. The design features flexible open office areas, 8 conference rooms, and support spaces including a ground floor café. The building meets all commercial building codes including ADA requirements and fire safety regulations. The estimated construction cost is $16 million ($320 per square foot).'
  }
};

// Mock agent service
const mockAgentService = {
  // Start a new session with a query
  startSession: async (query) => {
    const sessionId = generateSessionId();
    
    // Return initial session state
    return {
      sessionId,
      status: 'initializing',
      results: {},
      finalAnswer: null
    };
  },
  
  // Process a query and return results over time
  processQuery: async (query, onUpdate) => {
    const sessionId = generateSessionId();
    
    // Initial state
    onUpdate({
      sessionId,
      status: 'running',
      results: {},
      finalAnswer: null
    });
    
    // Determine which response set to use
    let responseSet = queryResponses.default;
    
    // Check for specific queries
    const lowerQuery = query.toLowerCase();
    if (lowerQuery.includes('house')) {
      responseSet = queryResponses['show me a house'];
    } else if (lowerQuery.includes('office')) {
      responseSet = queryResponses['design an office building'];
    }
    
    // Process each tool with delays
    const results = {};
    
    for (let i = 0; i < responseSet.tools.length; i++) {
      const tool = responseSet.tools[i];
      const toolKey = `tool_${i}`;
      
      // Set tool as running
      results[toolKey] = {
        tool: tool.tool,
        status: 'Running',
        result: 'Executing...'
      };
      
      onUpdate({
        sessionId,
        status: 'running',
        results: {...results},
        finalAnswer: null
      });
      
      // Wait for tool to complete (simulate processing time)
      const delay = 2000 + Math.random() * 2000; // 2-4 seconds
      const completedTool = await simulateToolExecution(
        tool.tool, 
        delay, 
        tool.result
      );
      
      // Update with completed tool
      results[toolKey] = completedTool;
      
      onUpdate({
        sessionId,
        status: 'running',
        results: {...results},
        finalAnswer: null
      });
    }
    
    // Add a delay before final answer
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Return final result
    onUpdate({
      sessionId,
      status: 'completed',
      results: results,
      finalAnswer: responseSet.finalAnswer
    });
    
    return {
      sessionId,
      status: 'completed',
      results: results,
      finalAnswer: responseSet.finalAnswer
    };
  }
};

export default mockAgentService; 