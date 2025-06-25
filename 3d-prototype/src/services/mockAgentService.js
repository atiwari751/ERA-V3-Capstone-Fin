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

// Track conversation context
let conversationContext = {
  lastTopic: null,
  mentionedBuildings: [],
  currentDesign: null
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
  },
  // Follow-up responses
  'how many bedrooms': {
    tools: [
      {
        tool: 'check_current_design',
        result: 'Checking current house design:\n- Design type: Single family home\n- Bedrooms: 3\n- Master bedroom: 220 sq ft\n- Bedroom 2: 140 sq ft\n- Bedroom 3: 130 sq ft'
      }
    ],
    finalAnswer: 'The current house design has 3 bedrooms. The master bedroom is 220 sq ft, and the other two bedrooms are 140 sq ft and 130 sq ft respectively. All bedrooms meet the minimum size requirements of 70 sq ft.'
  },
  'add another bedroom': {
    tools: [
      {
        tool: 'modify_house_design',
        result: 'Modifying house design:\n- Converting den/office space to bedroom\n- New bedroom size: 120 sq ft\n- Adding closet and window for egress\n- Adjusting HVAC for additional room'
      },
      {
        tool: 'recalculate_specifications',
        result: 'Updated specifications:\n- Total bedrooms: 4\n- Total area: 1,900 sq ft (increased by 100 sq ft)\n- Estimated construction cost increase: $15,000'
      }
    ],
    finalAnswer: 'I\'ve modified the house design to include a 4th bedroom. I converted the den/office space into a 120 sq ft bedroom with a closet and window for egress. This increases the total house size to 1,900 sq ft and would add approximately $15,000 to the construction cost.'
  },
  'what is the cost': {
    tools: [
      {
        tool: 'calculate_cost',
        result: 'Calculating construction costs for current design:\n- Base construction: $300 per sq ft\n- Total area: 1,800 sq ft\n- Base cost: $540,000\n- Premium finishes: +$50,000\n- Site work: +$30,000\n- Total estimated cost: $620,000'
      }
    ],
    finalAnswer: 'The estimated construction cost for this 1,800 sq ft house is $620,000. This includes $540,000 for base construction ($300 per sq ft), $50,000 for premium finishes, and $30,000 for site work. This estimate doesn\'t include land costs, permits, or design fees.'
  },
  'make it bigger': {
    tools: [
      {
        tool: 'resize_design',
        result: 'Resizing current design:\n- Increasing all room dimensions by 15%\n- Original size: 1,800 sq ft\n- New size: 2,070 sq ft\n- Adjusting structural elements and HVAC accordingly'
      },
      {
        tool: 'recalculate_costs',
        result: 'Updated cost calculation:\n- New area: 2,070 sq ft\n- Base construction: $300 per sq ft = $621,000\n- Premium finishes: +$57,500\n- Site work: +$30,000 (unchanged)\n- Total new estimate: $708,500 (+$88,500)'
      }
    ],
    finalAnswer: 'I\'ve increased the house size by 15%, bringing it to 2,070 sq ft. All rooms have been proportionally enlarged while maintaining the same layout. The new estimated cost is $708,500, which is $88,500 more than the original design.'
  },
  'add a swimming pool': {
    tools: [
      {
        tool: 'design_pool',
        result: 'Designing swimming pool:\n- Pool size: 16\' x 32\' (512 sq ft)\n- Depth: 3\' to 6\' (sloped)\n- Features: LED lighting, tiled border, concrete deck\n- Equipment: Filtration system, heater, automatic cover'
      },
      {
        tool: 'calculate_pool_costs',
        result: 'Pool construction estimate:\n- Excavation and shell: $45,000\n- Filtration and equipment: $12,000\n- Decking (600 sq ft): $18,000\n- Features and finishing: $15,000\n- Total pool cost: $90,000'
      }
    ],
    finalAnswer: 'I\'ve added a 16\' x 32\' swimming pool to the design. The pool ranges from 3\' to 6\' in depth and includes LED lighting, a tiled border, and a concrete deck. The estimated cost for the pool is $90,000, which includes excavation, equipment, decking, and finishing.'
  },
  'how many floors': {
    tools: [
      {
        tool: 'check_building_structure',
        result: 'Analyzing current building design:\n- Building type: Office building\n- Number of floors: 5\n- Floor heights: 14 feet (ground floor), 12 feet (upper floors)\n- Total height: 62 feet'
      }
    ],
    finalAnswer: 'The current office building design has 5 floors. The ground floor has a height of 14 feet to accommodate the reception and café areas, while the upper floors are each 12 feet high. The total building height is 62 feet.'
  }
};

// Helper function to find the best response based on query and context
const findBestResponse = (query) => {
  const lowerQuery = query.toLowerCase();
  
  // Check for exact matches first
  for (const [key, response] of Object.entries(queryResponses)) {
    if (lowerQuery.includes(key)) {
      // Update conversation context
      if (key === 'show me a house') {
        conversationContext.lastTopic = 'house';
        conversationContext.currentDesign = 'house';
        conversationContext.mentionedBuildings.push('house');
      } else if (key === 'design an office building') {
        conversationContext.lastTopic = 'office';
        conversationContext.currentDesign = 'office';
        conversationContext.mentionedBuildings.push('office');
      }
      return response;
    }
  }
  
  // Check for follow-up questions based on context
  if (conversationContext.lastTopic === 'house') {
    if (lowerQuery.includes('bedroom') || lowerQuery.includes('room')) {
      if (lowerQuery.includes('add') || lowerQuery.includes('more')) {
        return queryResponses['add another bedroom'];
      } else {
        return queryResponses['how many bedrooms'];
      }
    } else if (lowerQuery.includes('cost') || lowerQuery.includes('price') || lowerQuery.includes('expensive')) {
      return queryResponses['what is the cost'];
    } else if (lowerQuery.includes('bigger') || lowerQuery.includes('larger') || lowerQuery.includes('size')) {
      return queryResponses['make it bigger'];
    } else if (lowerQuery.includes('pool') || lowerQuery.includes('swimming')) {
      return queryResponses['add a swimming pool'];
    }
  } else if (conversationContext.lastTopic === 'office') {
    if (lowerQuery.includes('floor') || lowerQuery.includes('level') || lowerQuery.includes('story')) {
      return queryResponses['how many floors'];
    }
  }
  
  // Default response if no match found
  return queryResponses.default;
};

// Mock agent service
const mockAgentService = {
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
    
    // Find the best response based on query and context
    const responseSet = findBestResponse(query);
    
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
      const delay = 1000 + Math.random() * 2000; // 1-3 seconds
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
    await new Promise(resolve => setTimeout(resolve, 1000));
    
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