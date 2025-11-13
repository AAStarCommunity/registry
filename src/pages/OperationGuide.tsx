import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { ToastContainer } from "react-toastify";
import { LanguageToggle } from "../components/LanguageToggle";
import "react-toastify/dist/ReactToastify.css";
import "./OperationGuide.css";

interface TabContent {
  id: string;
  titleKey: string;
  icon: string;
}

export const OperationGuide = () => {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<string>("overview");

  const tabs: TabContent[] = [
    { id: "overview", titleKey: "operationGuide.tabs.overview", icon: "📊" },
    { id: "gas-token", titleKey: "operationGuide.tabs.gasToken", icon: "⛽" },
    { id: "revenue", titleKey: "operationGuide.tabs.revenue", icon: "💰" },
    { id: "tasks", titleKey: "operationGuide.tabs.tasks", icon: "✅" },
    { id: "events", titleKey: "operationGuide.tabs.events", icon: "🎯" },
    { id: "analytics", titleKey: "operationGuide.tabs.analytics", icon: "📈" },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <div className="tab-content">
            <h2>{t('operationGuide.overview.title')}</h2>
            <p className="intro">
              {t('operationGuide.overview.description')}
            </p>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">👥</div>
                <h3>{t('operationGuide.overview.stats.lowerBarrier.title')}</h3>
                <p>{t('operationGuide.overview.stats.lowerBarrier.description')}</p>
              </div>
              <div className="stat-card">
                <div className="stat-icon">💎</div>
                <h3>{t('operationGuide.overview.stats.createValue.title')}</h3>
                <p>{t('operationGuide.overview.stats.createValue.description')}</p>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🔄</div>
                <h3>{t('operationGuide.overview.stats.positiveCycle.title')}</h3>
                <p>{t('operationGuide.overview.stats.positiveCycle.description')}</p>
              </div>
            </div>

            <div className="quick-start">
              <h3>{t('operationGuide.overview.quickStart.title')}</h3>
              <div className="steps">
                <div className="step">
                  <div className="step-number">1</div>
                  <div className="step-content">
                    <h4>{t('operationGuide.overview.quickStart.steps.register.title')}</h4>
                    <p>{t('operationGuide.overview.quickStart.steps.register.description')}</p>
                    <Link to="/register-community" className="step-link">{t('operationGuide.overview.quickStart.steps.register.link')}</Link>
                  </div>
                </div>
                <div className="step">
                  <div className="step-number">2</div>
                  <div className="step-content">
                    <h4>{t('operationGuide.overview.quickStart.steps.deploy.title')}</h4>
                    <p>{t('operationGuide.overview.quickStart.steps.deploy.description')}</p>
                    <Link to="/get-xpnts" className="step-link">{t('operationGuide.overview.quickStart.steps.deploy.link')}</Link>
                  </div>
                </div>
                <div className="step">
                  <div className="step-number">3</div>
                  <div className="step-content">
                    <h4>{t('operationGuide.overview.quickStart.steps.launch.title')}</h4>
                    <p>{t('operationGuide.overview.quickStart.steps.launch.description')}</p>
                    <Link to="/launch-paymaster" className="step-link">{t('operationGuide.overview.quickStart.steps.launch.link')}</Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case "gas-token":
        return (
          <div className="tab-content">
            <h2>⛽ Gas代币管理</h2>
            
            <div className="section">
              <h3>什么是xPNTs？</h3>
              <p>
                xPNTs是您社区的专属积分代币，用于支付Gas费用和社区内部经济活动。
                它将原本的纯成本支出转化为社区价值流通的媒介。
              </p>
              
              <div className="feature-grid">
                <div className="feature">
                  <h4>💸 Gas支付</h4>
                  <p>成员使用xPNTs支付链上交易Gas，实现真正的"无感"体验</p>
                </div>
                <div className="feature">
                  <h4>🎁 任务奖励</h4>
                  <p>完成社区任务获得xPNTs奖励，激励成员参与</p>
                </div>
                <div className="feature">
                  <h4>🛒 商店消费</h4>
                  <p>在社区商店兑换NFT、周边、服务等，创造消费场景</p>
                </div>
                <div className="feature">
                  <h4>📊 价值储存</h4>
                  <p>作为社区价值凭证，可设计通缩机制提升价值</p>
                </div>
              </div>
            </div>

            <div className="section">
              <h3>代币经济模型</h3>
              <div className="economy-model">
                <div className="model-item">
                  <h4>📈 发行机制</h4>
                  <ul>
                    <li>固定总量：推荐100万-1000万枚</li>
                    <li>增发规则：可设计社区投票增发机制</li>
                    <li>初始分配：40%财库+30%任务奖励+20%团队+10%生态</li>
                  </ul>
                </div>
                <div className="model-item">
                  <h4>🔥 消耗场景</h4>
                  <ul>
                    <li>Gas支付：主要消耗场景，按实际Gas消耗</li>
                    <li>商店兑换：兑换独家NFT、实物周边</li>
                    <li>特权服务：VIP身份、专属功能解锁</li>
                  </ul>
                </div>
                <div className="model-item">
                  <h4>💰 价值支撑</h4>
                  <ul>
                    <li>社区财库：定期回购销毁，支撑代币价值</li>
                    <li>服务收入：Paymaster服务费收入注入财库</li>
                    <li>生态合作：与外部项目合作，提供兑换场景</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="action-box">
              <h3>🎯 操作建议</h3>
              <ol>
                <li><strong>合理设计总量</strong>：根据社区规模设定代币总量，避免通胀</li>
                <li><strong>多场景消耗</strong>：创造丰富的消耗场景，维持代币需求</li>
                <li><strong>定期回购</strong>：将部分收入用于回购销毁，支撑代币价值</li>
                <li><strong>透明治理</strong>：建立社区治理机制，让成员参与代币经济决策</li>
              </ol>
              <Link to="/get-xpnts" className="cta-button">立即发行xPNTs</Link>
            </div>
          </div>
        );

      case "revenue":
        return (
          <div className="tab-content">
            <h2>💰 收入模型分析</h2>
            
            <div className="section">
              <h3>成本转收入的机会</h3>
              <p>
                基于链上数据分析，典型L2活跃用户月度Gas成本约$1.95。
                通过SuperPaymaster，社区可以将这笔纯成本转化为稳定收入。
              </p>

              <div className="cost-analysis">
                <h4>📊 用户行为成本分析</h4>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>行为类型</th>
                      <th>月频次</th>
                      <th>单次成本</th>
                      <th>月度成本</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>代币转账</td>
                      <td>10次</td>
                      <td>$0.05</td>
                      <td>$0.50</td>
                    </tr>
                    <tr>
                      <td>DApp交互</td>
                      <td>10次</td>
                      <td>$0.10</td>
                      <td>$1.00</td>
                    </tr>
                    <tr>
                      <td>铸造/领取</td>
                      <td>3次</td>
                      <td>$0.15</td>
                      <td>$0.45</td>
                    </tr>
                    <tr className="total">
                      <td><strong>总计</strong></td>
                      <td><strong>23次</strong></td>
                      <td>-</td>
                      <td><strong>$1.95</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="section">
              <h3>收入潜力测算</h3>
              <div className="revenue-projection">
                <div className="projection-card">
                  <h4>小型社区 (30人)</h4>
                  <div className="numbers">
                    <p>月Gas消耗: <span>$58.5</span></p>
                    <p>服务费收入 (2%): <span>$1.17</span></p>
                    <p>年收入: <span>$14.04</span></p>
                  </div>
                </div>
                <div className="projection-card">
                  <h4>中型社区 (50人)</h4>
                  <div className="numbers">
                    <p>月Gas消耗: <span>$97.5</span></p>
                    <p>服务费收入 (2%): <span>$1.95</span></p>
                    <p>年收入: <span>$23.40</span></p>
                  </div>
                </div>
                <div className="projection-card">
                  <h4>大型社区 (120人)</h4>
                  <div className="numbers">
                    <p>月Gas消耗: <span>$234.0</span></p>
                    <p>服务费收入 (2%): <span>$4.68</span></p>
                    <p>年收入: <span>$56.16</span></p>
                  </div>
                </div>
              </div>
            </div>

            <div className="section">
              <h3>收入来源多样化</h3>
              <div className="revenue-sources">
                <div className="source">
                  <h4>💸 Gas服务费</h4>
                  <p>收取2-5%的Gas服务费，这是最直接的收入来源</p>
                </div>
                <div className="source">
                  <h4>🏪 商店收入</h4>
                  <p>社区商店销售NFT、周边商品、服务的收入</p>
                </div>
                <div className="source">
                  <h4>🤝 合作收入</h4>
                  <p>与外部项目合作，提供推广服务的收入</p>
                </div>
                <div className="source">
                  <h4>📊 数据服务</h4>
                  <p>为研究机构提供匿名化社区数据分析服务</p>
                </div>
              </div>
            </div>

            <div className="action-box">
              <h3>🎯 收入优化策略</h3>
              <ol>
                <li><strong>分层服务</strong>：为不同等级用户提供差异化服务</li>
                <li><strong>动态费率</strong>：根据网络拥堵情况调整服务费率</li>
                <li><strong>增值服务</strong>：提供优先处理、专属支持等增值服务</li>
                <li><strong>生态扩展</strong>：接入更多DApp，扩大服务范围</li>
              </ol>
              <Link to="/launch-paymaster" className="cta-button">开始创收</Link>
            </div>
          </div>
        );

      case "tasks":
        return (
          <div className="tab-content">
            <h2>✅ 任务系统设计</h2>
            
            <div className="section">
              <h3>任务生态闭环</h3>
              <p>
                通过任务系统，将社区成员的参与行为转化为可量化的贡献，
                并给予xPNTs奖励，形成"贡献-奖励-消费"的完整闭环。
              </p>

              <div className="task-cycle">
                <div className="cycle-step">
                  <div className="cycle-icon">📝</div>
                  <h4>任务发布</h4>
                  <p>社区管理员发布各类任务，设置奖励和完成条件</p>
                </div>
                <div className="cycle-arrow">→</div>
                <div className="cycle-step">
                  <div className="cycle-icon">🎯</div>
                  <h4>成员参与</h4>
                  <p>成员选择感兴趣的任务，完成后提交证明</p>
                </div>
                <div className="cycle-arrow">→</div>
                <div className="cycle-step">
                  <div className="cycle-icon">🏆</div>
                  <h4>获得奖励</h4>
                  <p>审核通过后，成员获得xPNTs积分奖励</p>
                </div>
                <div className="cycle-arrow">→</div>
                <div className="cycle-step">
                  <div className="cycle-icon">🛒</div>
                  <h4>消费循环</h4>
                  <p>使用xPNTs支付Gas或在商店兑换商品</p>
                </div>
              </div>
            </div>

            <div className="section">
              <h3>任务类型设计</h3>
              <div className="task-categories">
                <div className="category">
                  <h4>🎨 创作任务</h4>
                  <ul>
                    <li>内容创作：撰写文章、制作视频、设计海报</li>
                    <li>代码贡献：提交PR、修复Bug、开发功能</li>
                    <li>设计创作：UI设计、NFT创作、周边设计</li>
                    <li>奖励：50-500 xPNTs</li>
                  </ul>
                </div>
                <div className="category">
                  <h4>📢 推广任务</h4>
                  <ul>
                    <li>社交媒体：转发推文、发布动态、邀请好友</li>
                    <li>社区推广：参与AMA、回答问题、帮助新人</li>
                    <li>内容传播：翻译文档、制作教程、分享经验</li>
                    <li>奖励：10-100 xPNTs</li>
                  </ul>
                </div>
                <div className="category">
                  <h4>🎯 参与任务</h4>
                  <ul>
                    <li>日常签到：每日登录、签到打卡</li>
                    <li>活动参与：参加会议、投票治理、测试产品</li>
                    <li>学习任务：完成教程、通过测试、获得认证</li>
                    <li>奖励：5-50 xPNTs</li>
                  </ul>
                </div>
                <div className="category">
                  <h4>💎 特殊任务</h4>
                  <ul>
                    <li>里程碑：社区发展重要节点庆祝</li>
                    <li>挑战赛：技术竞赛、创意大赛</li>
                    <li>限时活动：节日活动、合作活动</li>
                    <li>奖励：100-1000+ xPNTs</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="section">
              <h3>任务管理最佳实践</h3>
              <div className="best-practices">
                <div className="practice">
                  <h4>📋 任务分级</h4>
                  <p>根据难度和贡献度，将任务分为初级、中级、高级，设置不同奖励</p>
                </div>
                <div className="practice">
                  <h4>⏱️ 及时审核</h4>
                  <p>建立快速审核机制，24小时内完成审核，提升用户体验</p>
                </div>
                <div className="practice">
                  <h4>🏅 排行榜</h4>
                  <p>设置贡献排行榜，定期表彰优秀贡献者，增强荣誉感</p>
                </div>
                <div className="practice">
                  <h4>🔄 动态调整</h4>
                  <p>根据社区发展需要，动态调整任务类型和奖励机制</p>
                </div>
              </div>
            </div>

            <div className="action-box">
              <h3>🎯 任务系统启动建议</h3>
              <ol>
                <li><strong>启动初期</strong>：以简单参与任务为主，降低门槛</li>
                <li><strong>成长期</strong>：增加创作和推广任务，丰富内容生态</li>
                <li><strong>成熟期</strong>：开放社区自治，让成员参与任务设计</li>
                <li><strong>持续优化</strong>：定期分析任务数据，优化奖励机制</li>
              </ol>
              <button 
                className="cta-button"
                onClick={() => toast.info("任务系统开发中，敬请期待！")}
              >
                设计任务系统
              </button>
            </div>
          </div>
        );

      case "events":
        return (
          <div className="tab-content">
            <h2>🎯 活动运营策略</h2>
            
            <div className="section">
              <h3>活动类型规划</h3>
              <p>
                通过多样化的社区活动，提升成员参与度和凝聚力，
                同时为xPNTs创造更多使用场景和价值支撑。
              </p>

              <div className="event-types">
                <div className="event-type">
                  <h4>🎉 线上活动</h4>
                  <div className="event-examples">
                    <div className="example">
                      <h5>AMA会议</h5>
                      <p>定期举办Ask Me Anything，与团队直接对话</p>
                      <div className="reward">参与奖励: 20 xPNTs</div>
                    </div>
                    <div className="example">
                      <h5>技术分享</h5>
                      <p>邀请技术专家分享最新进展和最佳实践</p>
                      <div className="reward">参与奖励: 30 xPNTs</div>
                    </div>
                    <div className="example">
                      <h5>工作坊</h5>
                      <p>手把手教学，帮助成员掌握新技能</p>
                      <div className="reward">完成奖励: 50 xPNTs</div>
                    </div>
                  </div>
                </div>

                <div className="event-type">
                  <h4>🏆 竞赛活动</h4>
                  <div className="event-examples">
                    <div className="example">
                      <h5>黑客松</h5>
                      <p>48小时编程挑战，开发创新应用</p>
                      <div className="reward">冠军: 1000 xPNTs</div>
                    </div>
                    <div className="example">
                      <h5>创意大赛</h5>
                      <p>NFT设计、Meme创作等创意竞赛</p>
                      <div className="reward">优胜: 500 xPNTs</div>
                    </div>
                    <div className="example">
                      <h5>贡献竞赛</h5>
                      <p>月度贡献排行，奖励最活跃成员</p>
                      <div className="reward">月度冠军: 300 xPNTs</div>
                    </div>
                  </div>
                </div>

                <div className="event-type">
                  <h4>🎁 节日活动</h4>
                  <div className="event-examples">
                    <div className="example">
                      <h5>新年活动</h5>
                      <p>新年祝福、回顾总结、新年目标</p>
                      <div className="reward">参与奖励: 88 xPNTs</div>
                    </div>
                    <div className="example">
                      <h5>周年庆典</h5>
                      <p>社区成立纪念日，特别庆祝活动</p>
                      <div className="reward">纪念NFT + 200 xPNTs</div>
                    </div>
                    <div className="example">
                      <h5>节日特别</h5>
                      <p>结合传统节日的特色活动</p>
                      <div className="reward">节日限定: 100 xPNTs</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="section">
              <h3>活动运营流程</h3>
              <div className="event-workflow">
                <div className="workflow-step">
                  <div className="step-number">1</div>
                  <h4>活动策划</h4>
                  <ul>
                    <li>确定活动目标和主题</li>
                    <li>设计活动规则和奖励机制</li>
                    <li>制定宣传推广计划</li>
                  </ul>
                </div>
                <div className="workflow-step">
                  <div className="step-number">2</div>
                  <h4>预热宣传</h4>
                  <ul>
                    <li>发布活动预告和规则说明</li>
                    <li>制作宣传物料（海报、视频）</li>
                    <li>邀请KOL和合作伙伴参与</li>
                  </ul>
                </div>
                <div className="workflow-step">
                  <div className="step-number">3</div>
                  <h4>活动执行</h4>
                  <ul>
                    <li>按时启动活动，确保技术稳定</li>
                    <li>实时监控活动进展和用户反馈</li>
                    <li>及时处理问题和答疑</li>
                  </ul>
                </div>
                <div className="workflow-step">
                  <div className="step-number">4</div>
                  <h4>复盘总结</h4>
                  <ul>
                    <li>统计活动数据和效果</li>
                    <li>发放奖励和表彰优秀参与者</li>
                    <li>总结经验，优化下次活动</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="section">
              <h3>活动效果评估</h3>
              <div className="metrics">
                <div className="metric">
                  <h4>📊 参与度指标</h4>
                  <ul>
                    <li>参与人数：实际参与活动的总人数</li>
                    <li>参与率：参与人数/社区总人数</li>
                    <li>活跃度：活动期间社区活跃度变化</li>
                  </ul>
                </div>
                <div className="metric">
                  <h4>💰 经济指标</h4>
                  <ul>
                    <li>xPNTs发放量：活动发放的代币总量</li>
                    <li>人均奖励：平均每人获得的奖励</li>
                    <li>ROI：活动投入产出比</li>
                  </ul>
                </div>
                <div className="metric">
                  <h4>🎯 质量指标</h4>
                  <ul>
                    <li>完成率：任务完成比例</li>
                    <li>满意度：参与者满意度评分</li>
                    <li>传播度：活动社交媒体传播效果</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="action-box">
              <h3>🎯 活动运营建议</h3>
              <ol>
                <li><strong>定期举办</strong>：建立活动日历，保持规律性</li>
                <li><strong>多样化</strong>：结合不同类型活动，满足不同成员需求</li>
                <li><strong>奖励合理</strong>：设计有吸引力但可持续的奖励机制</li>
                <li><strong>数据驱动</strong>：基于数据优化活动策略</li>
              </ol>
              <button 
                className="cta-button"
                onClick={() => toast.info("活动管理功能开发中，敬请期待！")}
              >
                创建活动
              </button>
            </div>
          </div>
        );

      case "analytics":
        return (
          <div className="tab-content">
            <h2>📈 数据分析与优化</h2>
            
            <div className="section">
              <h3>核心数据指标</h3>
              <p>
                通过全面的数据分析，了解社区运营状况，发现优化机会，
                驱动社区持续健康发展。
              </p>

              <div className="analytics-grid">
                <div className="analytics-card">
                  <h4>👥 用户指标</h4>
                  <div className="metrics-list">
                    <div className="metric-item">
                      <span className="metric-name">活跃用户数</span>
                      <span className="metric-value">DAU/WAU/MAU</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-name">新增用户</span>
                      <span className="metric-value">日/周/月新增</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-name">留存率</span>
                      <span className="metric-value">次日/7日/30日</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-name">用户画像</span>
                      <span className="metric-value">地域/行为/偏好</span>
                    </div>
                  </div>
                </div>

                <div className="analytics-card">
                  <h4>💰 经济指标</h4>
                  <div className="metrics-list">
                    <div className="metric-item">
                      <span className="metric-name">Gas消耗量</span>
                      <span className="metric-value">总量/人均/趋势</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-name">服务费收入</span>
                      <span className="metric-value">日/周/月收入</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-name">xPNTs流通</span>
                      <span className="metric-value">发行量/流通量/销毁量</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-name">代币价格</span>
                      <span className="metric-value">市场价/内在价值</span>
                    </div>
                  </div>
                </div>

                <div className="analytics-card">
                  <h4>🎯 活动指标</h4>
                  <div className="metrics-list">
                    <div className="metric-item">
                      <span className="metric-name">任务完成率</span>
                      <span className="metric-value">完成数/发布数</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-name">活动参与度</span>
                      <span className="metric-value">参与人数/总用户</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-name">内容产出</span>
                      <span className="metric-value">数量/质量/传播</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-name">社区健康度</span>
                      <span className="metric-value">活跃度/满意度/NPS</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="section">
              <h3>数据分析工具</h3>
              <div className="tools-section">
                <div className="tool">
                  <h4>📊 内置分析</h4>
                  <p>SuperPaymaster提供内置的数据分析面板，实时监控关键指标</p>
                  <Link to="/explorer" className="tool-link">查看分析面板 →</Link>
                </div>
                <div className="tool">
                  <h4>🔍 链上数据</h4>
                  <p>通过区块链浏览器和API获取详细的链上交易数据</p>
                  <a href="https://sepolia.etherscan.io" target="_blank" rel="noopener noreferrer" className="tool-link">Etherscan →</a>
                </div>
                <div className="tool">
                  <h4>📈 第三方工具</h4>
                  <p>集成Dune Analytics、Nansen等专业分析工具</p>
                  <a href="https://dune.com" target="_blank" rel="noopener noreferrer" className="tool-link">Dune Analytics →</a>
                </div>
              </div>
            </div>

            <div className="section">
              <h3>优化策略建议</h3>
              <div className="optimization-strategies">
                <div className="strategy">
                  <h4>🎯 用户增长优化</h4>
                  <ul>
                    <li>分析用户流失原因，改进新用户体验</li>
                    <li>优化任务难度梯度，提升完成率</li>
                    <li>个性化推荐，提高用户参与度</li>
                  </ul>
                </div>
                <div className="strategy">
                  <h4>💰 经济模型优化</h4>
                  <ul>
                    <li>动态调整服务费率，平衡收入和用户体验</li>
                    <li>优化xPNTs发行和销毁机制</li>
                    <li>拓展代币使用场景，提升内在价值</li>
                  </ul>
                </div>
                <div className="strategy">
                  <h4>📊 运营效率优化</h4>
                  <ul>
                    <li>自动化任务审核和奖励发放</li>
                    <li>数据驱动的活动策划和优化</li>
                    <li>建立预警机制，及时发现问题</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="action-box">
              <h3>🎯 数据驱动决策</h3>
              <ol>
                <li><strong>建立仪表盘</strong>：实时监控核心指标，及时发现问题</li>
                <li><strong>定期分析</strong>：每周/月进行数据复盘，制定优化策略</li>
                <li><strong>A/B测试</strong>：对不同策略进行测试，选择最优方案</li>
                <li><strong>预测分析</strong>：基于历史数据预测趋势，提前规划</li>
              </ol>
              <Link to="/explorer" className="cta-button">查看数据分析</Link>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="operation-guide">
      <ToastContainer />
      
      <header className="guide-header">
        <div className="header-content">
          <div className="header-text">
            <h1>🚀 {t('operationGuide.title')}</h1>
            <p>{t('operationGuide.subtitle')}</p>
          </div>
          <div className="header-actions">
            <LanguageToggle />
          </div>
        </div>
      </header>

      <div className="guide-content">
        <nav className="tab-navigation">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-title">{t(tab.titleKey)}</span>
            </button>
          ))}
        </nav>

        <main className="tab-content-container">
          {renderTabContent()}
        </main>
      </div>

      <footer className="guide-footer">
        <div className="footer-content">
          <h3>{t('operationGuide.footer.title')}</h3>
          <p>{t('operationGuide.footer.description')}</p>
          <div className="footer-actions">
            <Link to="/contact" className="footer-button">{t('operationGuide.footer.contactSupport')}</Link>
            <a 
              href="https://docs.superpaymaster.io" 
              target="_blank" 
              rel="noopener noreferrer"
              className="footer-button secondary"
            >
              {t('operationGuide.footer.viewDocs')}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};